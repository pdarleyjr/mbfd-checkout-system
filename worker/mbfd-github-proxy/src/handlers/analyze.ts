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

    // Fetch inspection data from GitHub Issues
    const inspectionData = await fetchInspectionData(env, timeframe, apparatus);

    if (inspectionData.length === 0) {
      return new Response(
        JSON.stringify({ 
          insights: [],
          message: 'No inspection data available for analysis',
          dataPoints: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate AI analysis
    const insights = await analyzeWithAI(env, inspectionData);

    return new Response(
      JSON.stringify({ 
        insights,
        dataPoints: inspectionData.length,
        timeframe,
        apparatus: apparatus || 'all',
        generatedAt: new Date().toISOString()
      }),
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

  const prompt = `You are an expert fleet maintenance analyst for the Miami Beach Fire Department (MBFD). Analyze the following vehicle inspection data and provide actionable insights.

Inspection Data (${inspectionData.length} inspections):
${dataSummary.substring(0, 3000)}

IMPORTANT INSTRUCTIONS:
- Base ALL recommendations ONLY on patterns and issues you see in the inspection data above
- DO NOT mention any equipment, apparatus, or issues that are not explicitly referenced in the data
- For each insight, reference the specific apparatus or equipment that prompted it (e.g., "Engine 2's oxygen cylinder")
- Include specific, actionable next steps for each recommendation
- DO NOT provide generic or hypothetical advice

Please provide a comprehensive fleet update with:
1. Top 3 recurring equipment issues or defects across the fleet (with apparatus names and frequency)
2. Apparatuses that need priority attention and specific reasons based on the data
3. Patterns in inspection timing, completion rates, or defect trends you observe
4. Critical safety concerns based on reported defects with specific examples
5. Recommended preventive maintenance actions with priorities and apparatus names
6. Overall fleet status and readiness assessment based on the data

Format your response as clear, actionable bullet points (start each with a dash -) that administrators can implement. Each bullet should reference specific apparatus or equipment when applicable.`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a fire department fleet maintenance analyst for Miami Beach Fire Department. Provide actionable insights based ONLY on the provided inspection data. Reference specific apparatus and equipment in your recommendations. Do not make up or assume information not in the data.' },
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