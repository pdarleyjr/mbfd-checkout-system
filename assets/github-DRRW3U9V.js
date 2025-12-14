import{c as y,b as D,L as f,D as $,A as E}from"./useApparatusStatus-CGZr2Mqw.js";import{r as S,j as w,_ as T}from"./index-Bv1ksOd1.js";const x=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],L=y("calendar",x);const A=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],j=y("check",A);const P=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],R=y("circle-check-big",P);const F=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],N=y("triangle-alert",F);const M=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],I=y("x",M),O=({isOpen:g,onClose:e,title:t,children:s,className:r})=>(S.useEffect(()=>(g?document.body.style.overflow="hidden":document.body.style.overflow="unset",()=>{document.body.style.overflow="unset"}),[g]),g?w.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center",children:[w.jsx("div",{className:"absolute inset-0 bg-black/50 backdrop-blur-sm",onClick:e}),w.jsxs("div",{className:D("relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",r),children:[w.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-gray-200",children:[w.jsx("h2",{className:"text-xl font-semibold text-gray-900",children:t}),w.jsx("button",{onClick:e,className:"p-1 hover:bg-gray-100 rounded-lg transition-colors",children:w.jsx(I,{className:"w-5 h-5 text-gray-500"})})]}),w.jsx("div",{className:"px-6 py-4",children:s})]})]}):null),h="https://mbfd-github-proxy.pdarleyjr.workers.dev/api";class v{adminPassword=null;constructor(){}setAdminPassword(e){this.adminPassword=e}clearAdminPassword(){this.adminPassword=null}isAdminAuthenticated(){return this.adminPassword!==null}getHeaders(e=!1){const t={"Content-Type":"application/json"};return e&&this.adminPassword&&(t["X-Admin-Password"]=this.adminPassword),t}async checkExistingDefects(e){try{const t=await fetch(`${h}/issues?state=open&labels=${f.DEFECT},${encodeURIComponent(e)}&per_page=100`,{method:"GET",headers:this.getHeaders()});if(!t.ok)return console.warn(`Failed to fetch defects: ${t.statusText}`),new Map;const s=await t.json(),r=Array.isArray(s)?s:[],i=new Map;for(const d of r){const o=d.title.match($);if(o){const[,,n,a]=o,c=`${n}:${a}`;i.set(c,d)}}return i}catch(t){return console.error("Error fetching existing defects:",t),new Map}}async submitChecklist(e){const{user:t,apparatus:s,date:r,defects:i}=e,d=await this.checkExistingDefects(s);let o=0;const n=[];for(const a of i)try{const c=`${a.compartment}:${a.item}`,l=d.get(c);l?await this.addCommentToDefect(l.number,t.name,t.rank,r,a.notes,a.photoUrl):await this.createDefectIssue(s,a.compartment,a.item,a.status,a.notes,t.name,t.rank,r,a.photoUrl)}catch(c){o++;const l=`${a.compartment}:${a.item}`;n.push(l),console.error(`Failed to process defect ${l}:`,c)}if(o>0)throw new Error(`Failed to submit ${o} defect(s): ${n.join(", ")}. Please try again.`);if(await this.createLogEntry(e),i.length>0)try{await this.createSupplyTasksForDefects(i,s)}catch(a){console.error("Failed to create supply tasks (non-fatal):",a)}}async createDefectIssue(e,t,s,r,i,d,o,n,a){const c=`[${e}] ${t}: ${s} - ${r==="missing"?"Missing":"Damaged"}`;let l=`
## Defect Report

**Apparatus:** ${e}
**Compartment:** ${t}
**Item:** ${s}
**Status:** ${r==="missing"?"❌ Missing":"⚠️ Damaged"}
**Reported By:** ${d} (${o})
**Date:** ${n}

### Notes
${i}
`;a&&(l+=`
### Photo Evidence

![Defect Photo](${a})
`),l+=`
---
*This issue was automatically created by the MBFD Checkout System.*`,l=l.trim();const u=[f.DEFECT,e];r==="damaged"&&u.push(f.DAMAGED);try{const m=await fetch(`${h}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:c,body:l,labels:u})});if(!m.ok)throw new Error(`Failed to create issue: ${m.statusText}`)}catch(m){throw console.error("Error creating defect issue:",m),m}}async addCommentToDefect(e,t,s,r,i,d){let o=`
### Verification Update

**Verified still present by:** ${t} (${s})
**Date:** ${r}

${i?`**Additional Notes:** ${i}`:""}
`;d&&(o+=`
### Photo Evidence

![Defect Photo](${d})
`),o+=`
---
*This comment was automatically added by the MBFD Checkout System.*`,o=o.trim();try{const n=await fetch(`${h}/issues/${e}/comments`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({body:o})});if(!n.ok)throw new Error(`Failed to add comment: ${n.statusText}`)}catch(n){throw console.error("Error adding comment to issue:",n),n}}async createLogEntry(e){const{user:t,apparatus:s,date:r,items:i}=e,d=`[${s}] Daily Inspection - ${r}`;let o=null,n="";try{const{buildReceiptPayloadFromInspection:c,createHostedReceipt:l,buildReceiptMarkdown:u}=await T(async()=>{const{buildReceiptPayloadFromInspection:p,createHostedReceipt:k,buildReceiptMarkdown:b}=await import("./receipt-nVCul5S8.js");return{buildReceiptPayloadFromInspection:p,createHostedReceipt:k,buildReceiptMarkdown:b}},[]),m=c(e);try{o=(await l(h,m,this.adminPassword||void 0)).url,console.log(`Created hosted receipt: ${o}`)}catch(p){console.error("Failed to create hosted receipt, using fallback:",p),n=u(m)}}catch(c){console.error("Receipt module import failed:",c)}let a=`
## Daily Inspection Log

**Apparatus:** ${s}
**Conducted By:** ${t.name} (${t.rank})
**Date:** ${r}

### Summary
- **Total Items Checked:** ${i.length}
- **Issues Found:** ${e.defects.length}

${e.defects.length>0?`
### Issues Reported
${e.defects.map(c=>`- ${c.compartment}: ${c.item} - ${c.status==="missing"?"❌ Missing":"⚠️ Damaged"}`).join(`
`)}`:"✅ All items present and working"}
`;o?a+=`

---

📋 **[View Full Printable Receipt](${o})**

_This receipt contains the complete inspection details in a print-friendly format._
`:n&&(a+=`

---

${n}
`),a+=`
---
*This inspection log was automatically created by the MBFD Checkout System.*`,a=a.trim();try{const c=await fetch(`${h}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:d,body:a,labels:[f.LOG,s]})});if(!c.ok)throw new Error(`Failed to create log: ${c.statusText}`);const l=await c.json(),u=await fetch(`${h}/issues/${l.number}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({state:"closed"})});if(u.ok)console.log(`Successfully created and closed log issue #${l.number}`);else{const m=await u.text();let p;try{p=JSON.parse(m)}catch{p={message:m}}console.error(`Failed to close log issue #${l.number}:`,{status:u.status,statusText:u.statusText,error:p,message:p.message||"Unknown error"}),console.warn(`Log entry created as issue #${l.number} but could not be closed. It may require manual closure or token permissions review.`)}}catch(c){throw console.error("Error creating log entry:",c),c}}async getAllDefects(){try{const e=await fetch(`${h}/issues?state=open&labels=${f.DEFECT}&per_page=100`,{method:"GET",headers:this.getHeaders(!0)});if(!e.ok)throw e.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch defects: ${e.statusText}`);const t=await e.json();return(Array.isArray(t)?t:[]).map(r=>this.parseDefectFromIssue(r))}catch(e){throw console.error("Error fetching all defects:",e),e}}parseDefectFromIssue(e){const t=e.title.match($);let s="Rescue 1",r="Unknown",i="Unknown",d="missing";t&&(s=t[1],r=t[2],i=t[3],d=t[4].toLowerCase());let o;if(e.body){const n=e.body.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);n&&(o=n[1])}return{issueNumber:e.number,apparatus:s,compartment:r,item:i,status:d,notes:e.body||"",reportedBy:e.user?.login||"Unknown",reportedAt:e.created_at,updatedAt:e.updated_at,resolved:!1,photoUrl:o}}async resolveDefect(e,t,s){try{const r=await fetch(`${h}/issues/${e}`,{method:"GET",headers:this.getHeaders(!0)});if(!r.ok)throw new Error(`Failed to fetch issue details: ${r.statusText}`);const o=(await r.json()).labels.map(c=>c.name).find(c=>E.includes(c)),n=[f.DEFECT,f.RESOLVED];o&&n.push(o),await fetch(`${h}/issues/${e}/comments`,{method:"POST",headers:this.getHeaders(!0),body:JSON.stringify({body:`
## ✅ Defect Resolved

**Resolved By:** ${s}
**Date:** ${new Date().toISOString()}

### Resolution
${t}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
`.trim()})});const a=await fetch(`${h}/issues/${e}`,{method:"PATCH",headers:this.getHeaders(!0),body:JSON.stringify({state:"closed",labels:n})});if(!a.ok)throw a.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to resolve defect: ${a.statusText}`)}catch(r){throw console.error("Error resolving defect:",r),r}}async getFleetStatus(){const e=await this.getAllDefects();return this.computeFleetStatus(e)}computeFleetStatus(e){const t=new Map;for(const s of E)t.set(s,0);return e.forEach(s=>{const r=t.get(s.apparatus)||0;t.set(s.apparatus,r+1)}),t}async getInspectionLogs(e=7){try{const t=new Date;t.setDate(t.getDate()-e);const s=await fetch(`${h}/issues?state=all&labels=${f.LOG}&per_page=100&since=${t.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!s.ok)throw s.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch logs: ${s.statusText}`);const r=await s.json();return Array.isArray(r)?r:[]}catch(t){throw console.error("Error fetching inspection logs:",t),t}}async getDailySubmissions(){try{const e=await this.getInspectionLogs(1),t=await this.getInspectionLogs(30),s=new Date().toLocaleDateString("en-US"),r=[],i=new Map,d=new Map;return E.forEach(o=>{i.set(o,0)}),t.forEach(o=>{const n=o.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const a=n[1],c=i.get(a)||0;i.set(a,c+1);const l=new Date(o.created_at).toLocaleDateString("en-US"),u=d.get(a);(!u||new Date(o.created_at)>new Date(u))&&d.set(a,l)}}),e.forEach(o=>{const n=o.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const a=n[1];new Date(o.created_at).toLocaleDateString("en-US")===s&&!r.includes(a)&&r.push(a)}}),{today:r,totals:i,lastSubmission:d}}catch(e){throw console.error("Error getting daily submissions:",e),e}}async analyzeLowStockItems(){try{const e=new Date;e.setDate(e.getDate()-30);const t=await fetch(`${h}/issues?state=all&labels=${f.DEFECT}&per_page=100&since=${e.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!t.ok)throw new Error(`Failed to fetch defects for analysis: ${t.statusText}`);const s=await t.json(),r=new Map;return s.forEach(d=>{if(d.title.includes("Missing")){const o=d.title.match($);if(o){const[,n,a,c]=o,l=`${a}:${c}`;if(r.has(l)){const u=r.get(l);u.apparatus.add(n),u.occurrences++}else r.set(l,{compartment:a,apparatus:new Set([n]),occurrences:1})}}}),Array.from(r.entries()).filter(([,d])=>d.occurrences>=2).map(([d,o])=>({item:d.split(":")[1],compartment:o.compartment,apparatus:Array.from(o.apparatus),occurrences:o.occurrences})).sort((d,o)=>o.occurrences-d.occurrences)}catch(e){throw console.error("Error analyzing low stock items:",e),e}}async sendNotification(e){try{const t=await fetch(`${h}/notify`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify(e)});if(!t.ok)throw new Error("Failed to send notification");return t.json()}catch(t){throw console.error("Error sending notification:",t),t}}async getEmailConfig(e){try{const t=await fetch(`${h}/config/email`,{method:"GET",headers:{"X-Admin-Password":e}});if(!t.ok)throw t.status===401?new Error("Unauthorized"):new Error("Failed to fetch email configuration");return t.json()}catch(t){throw console.error("Error fetching email config:",t),t}}async updateEmailConfig(e,t){try{const s=await fetch(`${h}/config/email`,{method:"PUT",headers:{"Content-Type":"application/json","X-Admin-Password":e},body:JSON.stringify(t)});if(!s.ok)throw s.status===401?new Error("Unauthorized"):new Error("Failed to update email configuration");return s.json()}catch(s){throw console.error("Error updating email config:",s),s}}async sendManualDigest(e){const t=await fetch(`${h}/digest/send`,{method:"POST",headers:{"X-Admin-Password":e}});if(!t.ok)throw t.status===401?new Error("Unauthorized"):new Error("Failed to send digest");return t.json()}async getAIInsights(e,t="week",s){const r=new URLSearchParams({timeframe:t,...s&&{apparatus:s}}),i=await fetch(`${h}/analyze?${r}`,{method:"GET",headers:{"X-Admin-Password":e}});if(!i.ok)throw i.status===401?new Error("Unauthorized"):i.status===503?new Error("AI features not enabled"):new Error("Failed to fetch AI insights");return i.json()}async createSupplyTasksForDefects(e,t){try{const s=await fetch(`${h}/tasks/create`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({defects:e,apparatus:t})});if(!s.ok)throw new Error(`Failed to create supply tasks: ${s.statusText}`);const r=await s.json();console.log(`Created ${r.tasksCreated||0} supply tasks from ${e.length} defects`)}catch(s){throw console.error("Error creating supply tasks:",s),s}}}const U=new v;export{j as C,O as M,N as T,I as X,L as a,R as b,U as g};
//# sourceMappingURL=github-DRRW3U9V.js.map
