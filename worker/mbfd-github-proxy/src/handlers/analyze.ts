import type { Env } from '../index';

interface AnalysisRequest {
  timeframe?: 'week' | 'month' | 'all';
  apparatus?: string;
}

interface GitHubIssue {
  title: string;
  body: string;
  created_at: string;
  closed_at: string;
  html_url: string;
}

function verifyAdminPassword(request: Request, env: Env): boolean {
  const providedPassword = request.headers.get('X-Admin-Password');
  return providedPassword === env.ADMIN_PASSWORD;
}

/**
 * Rate limiting helper: Check if we can run analysis based on cache
 * Prevents continuous execution - only allows once per 5 minutes per unique query
 */
async function checkRateLimit(
  env: Env,
  timeframe: string,
  apparatus: string | null
): Promise<{ allowed: boolean; cachedResult?: any; cacheAge?: number }> {
  const cacheKey = `ai_analysis:${timeframe}:${apparatus || 'all'}`;
  
  try {
    const cached = await env.MBFD_CONFIG.get(cacheKey, 'json');
    
    if (cached) {
      const cacheAge = Date.now() - (cached as any).timestamp;
      const FIVE_MINUTES = 5 * 60 * 1000;
      
      if (cacheAge < FIVE_MINUTES) {
        console.log(`Rate limit: returning cached analysis (${Math.round(cacheAge / 1000)}s old)`);
        return { 
          allowed: false, 
          cachedResult: (cached as any).result,
          cacheAge: Math.round(cacheAge / 1000)
        };
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Allow on error
  }
}

/**
 * Store analysis result in cache
 */
async function cacheAnalysisResult(
  env: Env,
  timeframe: string,
  apparatus: string | null,
  result: any
): Promise<void> {
  const cacheKey = `ai_analysis:${timeframe}:${apparatus || 'all'}`;
  
  try {
    await env.MBFD_CONFIG.put(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      result
    }), {
      expirationTtl: 3600 // 1 hour TTL
    });
  } catch (error) {
    console.error('Failed to cache analysis:', error);
  }
}

export async function handleAnalyze(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Verify admin authentication
  if (!verifyAdminPassword(request, env)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Check if AI is available
  if (!env.AI) {
    return new Response(
      JSON.stringify({ 
        error: 'AI features not enabled',
        message: 'Workers AI binding not configured'
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || 'week';
    const apparatus = url.searchParams.get('apparatus') || null;
    const forceRefresh = url.searchParams.get('force') === 'true';

    // Check rate limit (unless force refresh requested)
    if (!forceRefresh) {
      const rateLimitCheck = await checkRateLimit(env, timeframe, apparatus);
      
      if (!rateLimitCheck.allowed && rateLimitCheck.cachedResult) {
        console.log('Returning cached AI analysis to prevent excessive API calls');
        return new Response(
          JSON.stringify({
            ...rateLimitCheck.cachedResult,
            cached: true,
            cacheAge: rateLimitCheck.cacheAge
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Fetch inspection data from GitHub Issues
    const inspectionData = await fetchInspectionData(env, timeframe, apparatus);

    if (inspectionData.length === 0) {
      const result = { 
        insights: [],
        message: 'No inspection data available for analysis',
        dataPoints: 0
      };
      
      // Cache even empty results
      await cacheAnalysisResult(env, timeframe, apparatus, result);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate AI analysis
    const insights = await analyzeWithAI(env, inspectionData);
    
    const result = { 
      insights,
      dataPoints: inspectionData.length,
      timeframe,
      apparatus: apparatus || 'all',
      generatedAt: new Date().toISOString()
    };

    // Cache the result
    await cacheAnalysisResult(env, timeframe, apparatus, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function fetchInspectionData(
  env: Env,
  timeframe: string,
  apparatus: string | null
): Promise<any[]> {
  // Calculate date cutoff
  const now = new Date();
  let cutoffDate = new Date();
  
  if (timeframe === 'week') {
    cutoffDate.setDate(now.getDate() - 7);
  } else if (timeframe === 'month') {
    cutoffDate.setDate(now.getDate() - 30);
  } else {
    cutoffDate.setFullYear(now.getFullYear() - 1); // Last year for 'all'
  }

  // Fetch closed issues with 'Log' label (inspection logs)
  const githubRepo = 'pdarleyjr/mbfd-checkout-system';
  const response = await fetch(
    `https://api.github.com/repos/${githubRepo}/issues?state=closed&labels=Log&per_page=100`,
    {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MBFD-Checkout-System'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch inspection data from GitHub');
  }

  const issues: GitHubIssue[] = await response.json();

  // Filter by date and apparatus
  return issues
    .filter((issue: GitHubIssue) => {
      const createdAt = new Date(issue.created_at);
      if (createdAt < cutoffDate) return false;
      
      if (apparatus && !issue.title.toLowerCase().includes(apparatus.toLowerCase())) {
        return false;
      }
      
      return true;
    })
    .map((issue: GitHubIssue) => ({
      title: issue.title,
      body: issue.body,
      createdAt: issue.created_at,
      closedAt: issue.closed_at,
      url: issue.html_url
    }));
}

async function analyzeWithAI(env: Env, inspectionData: any[]): Promise<string[]> {
  // Prepare data summary for AI
  const dataSummary = inspectionData.map((inspection, idx) => 
    `Inspection ${idx + 1}: ${inspection.title}\n${inspection.body?.substring(0, 500) || 'No details'}`
  ).join('\n\n');

  const prompt = `You are an expert fleet maintenance analyst for the Manhattan Beach Fire Department. Analyze the following vehicle inspection data and provide actionable insights.

Inspection Data (${inspectionData.length} inspections):
${dataSummary.substring(0, 3000)}

Please provide a comprehensive fleet update with:
1. Top 3 recurring equipment issues or defects across the fleet
2. Apparatuses that need priority attention and why
3. Patterns in inspection timing, completion rates, or defect trends
4. Critical safety concerns based on reported defects
5. Recommended preventive maintenance actions with priorities
6. Overall fleet status and readiness assessment

Format your response as clear, actionable bullet points that administrators can implement. Focus on specific recommendations, not general observations.`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a fire department fleet maintenance analyst providing actionable insights for administrators.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.7
    });

    // Parse AI response into discrete insights
    const aiText: string = (response as any).response || '';
    const insights = aiText
      .split('\n')
      .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./))
      .map((line: string) => line.trim().replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''))
      .filter((insight: string) => insight.length > 10);

    return insights.length > 0 ? insights : ['No specific insights generated. Consider collecting more inspection data.'];

  } catch (error) {
    console.error('AI analysis failed:', error);
    return ['AI analysis temporarily unavailable. Please try again later.'];
  }
}