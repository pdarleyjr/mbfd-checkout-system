import{c as p,b as $,L as u,D as y,A as g}from"./config-CRLKCfXr.js";import{r as E,j as f}from"./index-DcZ93XxU.js";const D=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],I=p("calendar",D);const b=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],M=p("circle-check-big",b);const k=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],P=p("triangle-alert",k);const S=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],T=p("x",S),j=({isOpen:w,onClose:t,title:e,children:s,className:r})=>(E.useEffect(()=>(w?document.body.style.overflow="hidden":document.body.style.overflow="unset",()=>{document.body.style.overflow="unset"}),[w]),w?f.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center",children:[f.jsx("div",{className:"absolute inset-0 bg-black/50 backdrop-blur-sm",onClick:t}),f.jsxs("div",{className:$("relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",r),children:[f.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-gray-200",children:[f.jsx("h2",{className:"text-xl font-semibold text-gray-900",children:e}),f.jsx("button",{onClick:t,className:"p-1 hover:bg-gray-100 rounded-lg transition-colors",children:f.jsx(T,{className:"w-5 h-5 text-gray-500"})})]}),f.jsx("div",{className:"px-6 py-4",children:s})]})]}):null),h="https://mbfd-github-proxy.pdarleyjr.workers.dev/api";class x{adminPassword=null;constructor(){}setAdminPassword(t){this.adminPassword=t}clearAdminPassword(){this.adminPassword=null}isAdminAuthenticated(){return this.adminPassword!==null}getHeaders(t=!1){const e={"Content-Type":"application/json"};return t&&this.adminPassword&&(e["X-Admin-Password"]=this.adminPassword),e}async checkExistingDefects(t){try{const e=await fetch(`${h}/issues?state=open&labels=${u.DEFECT},${encodeURIComponent(t)}&per_page=100`,{method:"GET",headers:this.getHeaders()});if(!e.ok)return console.warn(`Failed to fetch defects: ${e.statusText}`),new Map;const s=await e.json(),r=Array.isArray(s)?s:[],c=new Map;for(const i of r){const a=i.title.match(y);if(a){const[,,n,o]=a,d=`${n}:${o}`;c.set(d,i)}}return c}catch(e){return console.error("Error fetching existing defects:",e),new Map}}async submitChecklist(t){const{user:e,apparatus:s,date:r,defects:c}=t,i=await this.checkExistingDefects(s);let a=0;const n=[];for(const o of c)try{const d=`${o.compartment}:${o.item}`,l=i.get(d);l?await this.addCommentToDefect(l.number,e.name,e.rank,r,o.notes):await this.createDefectIssue(s,o.compartment,o.item,o.status,o.notes,e.name,e.rank,r)}catch(d){a++;const l=`${o.compartment}: ${o.item}`;n.push(l),console.error(`Failed to process defect ${l}:`,d)}if(a>0)throw new Error(`Failed to submit ${a} defect(s): ${n.join(", ")}. Please try again.`);await this.createLogEntry(t)}async createDefectIssue(t,e,s,r,c,i,a,n){const o=`[${t}] ${e}: ${s} - ${r==="missing"?"Missing":"Damaged"}`,d=`
## Defect Report

**Apparatus:** ${t}
**Compartment:** ${e}
**Item:** ${s}
**Status:** ${r==="missing"?"❌ Missing":"⚠️ Damaged"}
**Reported By:** ${i} (${a})
**Date:** ${n}

### Notes
${c}

---
*This issue was automatically created by the MBFD Checkout System.*
`.trim(),l=[u.DEFECT,t];r==="damaged"&&l.push(u.DAMAGED);try{const m=await fetch(`${h}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:o,body:d,labels:l})});if(!m.ok)throw new Error(`Failed to create issue: ${m.statusText}`)}catch(m){throw console.error("Error creating defect issue:",m),m}}async addCommentToDefect(t,e,s,r,c){const i=`
### Verification Update

**Verified still present by:** ${e} (${s})
**Date:** ${r}

${c?`**Additional Notes:** ${c}`:""}

---
*This comment was automatically added by the MBFD Checkout System.*
`.trim();try{const a=await fetch(`${h}/issues/${t}/comments`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({body:i})});if(!a.ok)throw new Error(`Failed to add comment: ${a.statusText}`)}catch(a){throw console.error("Error adding comment to issue:",a),a}}async createLogEntry(t){const{user:e,apparatus:s,date:r,items:c}=t,i=`[${s}] Daily Inspection - ${r}`,a=`
## Daily Inspection Log

**Apparatus:** ${s}
**Conducted By:** ${e.name} (${e.rank})
**Date:** ${r}

### Summary
- **Total Items Checked:** ${c.length}
- **Issues Found:** ${t.defects.length}

${t.defects.length>0?`
### Issues Reported
${t.defects.map(n=>`- ${n.compartment}: ${n.item} - ${n.status==="missing"?"❌ Missing":"⚠️ Damaged"}`).join(`
`)}`:"✅ All items present and working"}}

---
*This inspection log was automatically created by the MBFD Checkout System.*
`.trim();try{const n=await fetch(`${h}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:i,body:a,labels:[u.LOG,s]})});if(!n.ok)throw new Error(`Failed to create log: ${n.statusText}`);const o=await n.json();await fetch(`${h}/issues/${o.number}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({state:"closed"})})}catch(n){throw console.error("Error creating log entry:",n),n}}async getAllDefects(){try{const t=await fetch(`${h}/issues?state=open&labels=${u.DEFECT}&per_page=100`,{method:"GET",headers:this.getHeaders(!0)});if(!t.ok)throw t.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch defects: ${t.statusText}`);const e=await t.json();return(Array.isArray(e)?e:[]).map(r=>this.parseDefectFromIssue(r))}catch(t){throw console.error("Error fetching all defects:",t),t}}parseDefectFromIssue(t){const e=t.title.match(y);let s="Rescue 1",r="Unknown",c="Unknown",i="missing";return e&&(s=e[1],r=e[2],c=e[3],i=e[4].toLowerCase()),{issueNumber:t.number,apparatus:s,compartment:r,item:c,status:i,notes:t.body||"",reportedBy:t.user?.login||"Unknown",reportedAt:t.created_at,updatedAt:t.updated_at,resolved:!1}}async resolveDefect(t,e,s){try{const r=await fetch(`${h}/issues/${t}`,{method:"GET",headers:this.getHeaders(!0)});if(!r.ok)throw new Error(`Failed to fetch issue details: ${r.statusText}`);const a=(await r.json()).labels.map(d=>d.name).find(d=>g.includes(d)),n=[u.DEFECT,u.RESOLVED];a&&n.push(a),await fetch(`${h}/issues/${t}/comments`,{method:"POST",headers:this.getHeaders(!0),body:JSON.stringify({body:`
## ✅ Defect Resolved

**Resolved By:** ${s}
**Date:** ${new Date().toISOString()}

### Resolution
${e}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
`.trim()})});const o=await fetch(`${h}/issues/${t}`,{method:"PATCH",headers:this.getHeaders(!0),body:JSON.stringify({state:"closed",labels:n})});if(!o.ok)throw o.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to resolve defect: ${o.statusText}`)}catch(r){throw console.error("Error resolving defect:",r),r}}async getFleetStatus(){const t=await this.getAllDefects();return this.computeFleetStatus(t)}computeFleetStatus(t){const e=new Map;for(const s of g)e.set(s,0);return t.forEach(s=>{const r=e.get(s.apparatus)||0;e.set(s.apparatus,r+1)}),e}async getInspectionLogs(t=7){try{const e=new Date;e.setDate(e.getDate()-t);const s=await fetch(`${h}/issues?state=closed&labels=${u.LOG}&per_page=100&since=${e.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!s.ok)throw s.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch logs: ${s.statusText}`);const r=await s.json();return Array.isArray(r)?r:[]}catch(e){throw console.error("Error fetching inspection logs:",e),e}}async getDailySubmissions(){try{const t=await this.getInspectionLogs(1),e=await this.getInspectionLogs(30),s=new Date().toLocaleDateString("en-US"),r=[],c=new Map,i=new Map;return g.forEach(a=>{c.set(a,0)}),e.forEach(a=>{const n=a.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const o=n[1],d=c.get(o)||0;c.set(o,d+1);const l=new Date(a.created_at).toLocaleDateString("en-US"),m=i.get(o);(!m||new Date(a.created_at)>new Date(m))&&i.set(o,l)}}),t.forEach(a=>{const n=a.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const o=n[1];new Date(a.created_at).toLocaleDateString("en-US")===s&&!r.includes(o)&&r.push(o)}}),{today:r,totals:c,lastSubmission:i}}catch(t){throw console.error("Error getting daily submissions:",t),t}}async analyzeLowStockItems(){try{const t=new Date;t.setDate(t.getDate()-30);const e=await fetch(`${h}/issues?state=all&labels=${u.DEFECT}&per_page=100&since=${t.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!e.ok)throw new Error(`Failed to fetch defects for analysis: ${e.statusText}`);const s=await e.json(),r=new Map;return s.forEach(i=>{if(i.title.includes("Missing")){const a=i.title.match(y);if(a){const[,n,o,d]=a,l=`${o}:${d}`;if(r.has(l)){const m=r.get(l);m.apparatus.add(n),m.occurrences++}else r.set(l,{compartment:o,apparatus:new Set([n]),occurrences:1})}}}),Array.from(r.entries()).filter(([,i])=>i.occurrences>=2).map(([i,a])=>({item:i.split(":")[1],compartment:a.compartment,apparatus:Array.from(a.apparatus),occurrences:a.occurrences})).sort((i,a)=>a.occurrences-i.occurrences)}catch(t){throw console.error("Error analyzing low stock items:",t),t}}async sendNotification(t){try{const e=await fetch(`${h}/notify`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify(t)});if(!e.ok)throw new Error("Failed to send notification");return e.json()}catch(e){throw console.error("Error sending notification:",e),e}}async getEmailConfig(t){try{const e=await fetch(`${h}/config/email`,{method:"GET",headers:{"X-Admin-Password":t}});if(!e.ok)throw e.status===401?new Error("Unauthorized"):new Error("Failed to fetch email configuration");return e.json()}catch(e){throw console.error("Error fetching email config:",e),e}}async updateEmailConfig(t,e){try{const s=await fetch(`${h}/config/email`,{method:"PUT",headers:{"Content-Type":"application/json","X-Admin-Password":t},body:JSON.stringify(e)});if(!s.ok)throw s.status===401?new Error("Unauthorized"):new Error("Failed to update email configuration");return s.json()}catch(s){throw console.error("Error updating email config:",s),s}}async sendManualDigest(t){const e=await fetch(`${h}/digest/send`,{method:"POST",headers:{"X-Admin-Password":t}});if(!e.ok)throw e.status===401?new Error("Unauthorized"):new Error("Failed to send digest");return e.json()}async getAIInsights(t,e="week",s){const r=new URLSearchParams({timeframe:e,...s&&{apparatus:s}}),c=await fetch(`${h}/analyze?${r}`,{method:"GET",headers:{"X-Admin-Password":t}});if(!c.ok)throw c.status===401?new Error("Unauthorized"):c.status===503?new Error("AI features not enabled"):new Error("Failed to fetch AI insights");return c.json()}}const L=new x;export{I as C,j as M,P as T,T as X,M as a,L as g};
//# sourceMappingURL=github-Bq2_02wC.js.map
