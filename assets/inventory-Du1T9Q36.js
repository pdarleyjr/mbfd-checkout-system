import{c as $,L as w,D as k,A as E}from"./config-DWvP8BqQ.js";import{_ as S}from"./index-CUAj9m3W.js";const b=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],_=$("calendar",b);const A=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],L=$("circle-check-big",A);const P=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],M=$("triangle-alert",P);const F=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],x=$("x",F),u="https://mbfd-github-proxy.pdarleyjr.workers.dev/api";class I{adminPassword=null;constructor(){}setAdminPassword(t){this.adminPassword=t}clearAdminPassword(){this.adminPassword=null}isAdminAuthenticated(){return this.adminPassword!==null}getHeaders(t=!1){const e={"Content-Type":"application/json"};return t&&this.adminPassword&&(e["X-Admin-Password"]=this.adminPassword),e}async checkExistingDefects(t){try{const e=await fetch(`${u}/issues?state=open&labels=${w.DEFECT},${encodeURIComponent(t)}&per_page=100`,{method:"GET",headers:this.getHeaders()});if(!e.ok)return console.warn(`Failed to fetch defects: ${e.statusText}`),new Map;const s=await e.json(),r=Array.isArray(s)?s:[],i=new Map;for(const c of r){const o=c.title.match(k);if(o){const[,,d,a]=o,n=`${d}:${a}`;i.set(n,c)}}return i}catch(e){return console.error("Error fetching existing defects:",e),new Map}}async submitChecklist(t){const{user:e,apparatus:s,date:r,defects:i}=t,c=await this.checkExistingDefects(s);let o=0;const d=[];for(const a of i)try{const n=`${a.compartment}:${a.item}`,h=c.get(n);h?await this.addCommentToDefect(h.number,e.name,e.rank,r,a.notes,a.photoUrl):await this.createDefectIssue(s,a.compartment,a.item,a.status,a.notes,e.name,e.rank,r,a.photoUrl)}catch(n){o++;const h=`${a.compartment}:${a.item}`;d.push(h),console.error(`Failed to process defect ${h}:`,n)}if(o>0)throw new Error(`Failed to submit ${o} defect(s): ${d.join(", ")}. Please try again.`);if(await this.createLogEntry(t),i.length>0)try{await this.createSupplyTasksForDefects(i,s)}catch(a){console.error("Failed to create supply tasks (non-fatal):",a)}}async createDefectIssue(t,e,s,r,i,c,o,d,a){const n=`[${t}] ${e}: ${s} - ${r==="missing"?"Missing":"Damaged"}`;let h=`
## Defect Report

**Apparatus:** ${t}
**Compartment:** ${e}
**Item:** ${s}
**Status:** ${r==="missing"?"❌ Missing":"⚠️ Damaged"}
**Reported By:** ${c} (${o})
**Date:** ${d}

### Notes
${i}
`;a&&(h+=`
### Photo Evidence

![Defect Photo](${a})
`),h+=`
---
*This issue was automatically created by the MBFD Checkout System.*`,h=h.trim();const p=[w.DEFECT,t];r==="damaged"&&p.push(w.DAMAGED);try{const f=await fetch(`${u}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:n,body:h,labels:p})});if(!f.ok)throw new Error(`Failed to create issue: ${f.statusText}`)}catch(f){throw console.error("Error creating defect issue:",f),f}}async addCommentToDefect(t,e,s,r,i,c){let o=`
### Verification Update

**Verified still present by:** ${e} (${s})
**Date:** ${r}

${i?`**Additional Notes:** ${i}`:""}
`;c&&(o+=`
### Photo Evidence

![Defect Photo](${c})
`),o+=`
---
*This comment was automatically added by the MBFD Checkout System.*`,o=o.trim();try{const d=await fetch(`${u}/issues/${t}/comments`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({body:o})});if(!d.ok)throw new Error(`Failed to add comment: ${d.statusText}`)}catch(d){throw console.error("Error adding comment to issue:",d),d}}async createLogEntry(t){const{user:e,apparatus:s,date:r,items:i}=t,c=`[${s}] Daily Inspection - ${r}`;let o=null,d="";try{const{buildReceiptPayloadFromInspection:n,createHostedReceipt:h,buildReceiptMarkdown:p}=await S(async()=>{const{buildReceiptPayloadFromInspection:m,createHostedReceipt:T,buildReceiptMarkdown:D}=await import("./receipt-nVCul5S8.js");return{buildReceiptPayloadFromInspection:m,createHostedReceipt:T,buildReceiptMarkdown:D}},[]),f=n(t);try{o=(await h(u,f,this.adminPassword||void 0)).url,console.log(`Created hosted receipt: ${o}`)}catch(m){console.error("Failed to create hosted receipt, using fallback:",m),d=p(f)}}catch(n){console.error("Receipt module import failed:",n)}let a=`
## Daily Inspection Log

**Apparatus:** ${s}
**Conducted By:** ${e.name} (${e.rank})
**Date:** ${r}

### Summary
- **Total Items Checked:** ${i.length}
- **Issues Found:** ${t.defects.length}

${t.defects.length>0?`
### Issues Reported
${t.defects.map(n=>`- ${n.compartment}: ${n.item} - ${n.status==="missing"?"❌ Missing":"⚠️ Damaged"}`).join(`
`)}`:"✅ All items present and working"}
`;o?a+=`

---

📋 **[View Full Printable Receipt](${o})**

_This receipt contains the complete inspection details in a print-friendly format._
`:d&&(a+=`

---

${d}
`),a+=`
---
*This inspection log was automatically created by the MBFD Checkout System.*`,a=a.trim();try{const n=await fetch(`${u}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:c,body:a,labels:[w.LOG,s]})});if(!n.ok)throw new Error(`Failed to create log: ${n.statusText}`);const h=await n.json(),p=await fetch(`${u}/issues/${h.number}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({state:"closed"})});if(p.ok)console.log(`Successfully created and closed log issue #${h.number}`);else{const f=await p.text();let m;try{m=JSON.parse(f)}catch{m={message:f}}console.error(`Failed to close log issue #${h.number}:`,{status:p.status,statusText:p.statusText,error:m,message:m.message||"Unknown error"}),console.warn(`Log entry created as issue #${h.number} but could not be closed. It may require manual closure or token permissions review.`)}}catch(n){throw console.error("Error creating log entry:",n),n}}async getAllDefects(){try{const t=await fetch(`${u}/issues?state=open&labels=${w.DEFECT}&per_page=100`,{method:"GET",headers:this.getHeaders(!0)});if(!t.ok)throw t.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch defects: ${t.statusText}`);const e=await t.json();return(Array.isArray(e)?e:[]).map(r=>this.parseDefectFromIssue(r))}catch(t){throw console.error("Error fetching all defects:",t),t}}parseDefectFromIssue(t){const e=t.title.match(k);let s="Rescue 1",r="Unknown",i="Unknown",c="missing";return e&&(s=e[1],r=e[2],i=e[3],c=e[4].toLowerCase()),{issueNumber:t.number,apparatus:s,compartment:r,item:i,status:c,notes:t.body||"",reportedBy:t.user?.login||"Unknown",reportedAt:t.created_at,updatedAt:t.updated_at,resolved:!1}}async resolveDefect(t,e,s){try{const r=await fetch(`${u}/issues/${t}`,{method:"GET",headers:this.getHeaders(!0)});if(!r.ok)throw new Error(`Failed to fetch issue details: ${r.statusText}`);const o=(await r.json()).labels.map(n=>n.name).find(n=>E.includes(n)),d=[w.DEFECT,w.RESOLVED];o&&d.push(o),await fetch(`${u}/issues/${t}/comments`,{method:"POST",headers:this.getHeaders(!0),body:JSON.stringify({body:`
## ✅ Defect Resolved

**Resolved By:** ${s}
**Date:** ${new Date().toISOString()}

### Resolution
${e}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
`.trim()})});const a=await fetch(`${u}/issues/${t}`,{method:"PATCH",headers:this.getHeaders(!0),body:JSON.stringify({state:"closed",labels:d})});if(!a.ok)throw a.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to resolve defect: ${a.statusText}`)}catch(r){throw console.error("Error resolving defect:",r),r}}async getFleetStatus(){const t=await this.getAllDefects();return this.computeFleetStatus(t)}computeFleetStatus(t){const e=new Map;for(const s of E)e.set(s,0);return t.forEach(s=>{const r=e.get(s.apparatus)||0;e.set(s.apparatus,r+1)}),e}async getInspectionLogs(t=7){try{const e=new Date;e.setDate(e.getDate()-t);const s=await fetch(`${u}/issues?state=all&labels=${w.LOG}&per_page=100&since=${e.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!s.ok)throw s.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch logs: ${s.statusText}`);const r=await s.json();return Array.isArray(r)?r:[]}catch(e){throw console.error("Error fetching inspection logs:",e),e}}async getDailySubmissions(){try{const t=await this.getInspectionLogs(1),e=await this.getInspectionLogs(30),s=new Date().toLocaleDateString("en-US"),r=[],i=new Map,c=new Map;return E.forEach(o=>{i.set(o,0)}),e.forEach(o=>{const d=o.title.match(/\[(.+)\]\s+Daily Inspection/);if(d){const a=d[1],n=i.get(a)||0;i.set(a,n+1);const h=new Date(o.created_at).toLocaleDateString("en-US"),p=c.get(a);(!p||new Date(o.created_at)>new Date(p))&&c.set(a,h)}}),t.forEach(o=>{const d=o.title.match(/\[(.+)\]\s+Daily Inspection/);if(d){const a=d[1];new Date(o.created_at).toLocaleDateString("en-US")===s&&!r.includes(a)&&r.push(a)}}),{today:r,totals:i,lastSubmission:c}}catch(t){throw console.error("Error getting daily submissions:",t),t}}async analyzeLowStockItems(){try{const t=new Date;t.setDate(t.getDate()-30);const e=await fetch(`${u}/issues?state=all&labels=${w.DEFECT}&per_page=100&since=${t.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!e.ok)throw new Error(`Failed to fetch defects for analysis: ${e.statusText}`);const s=await e.json(),r=new Map;return s.forEach(c=>{if(c.title.includes("Missing")){const o=c.title.match(k);if(o){const[,d,a,n]=o,h=`${a}:${n}`;if(r.has(h)){const p=r.get(h);p.apparatus.add(d),p.occurrences++}else r.set(h,{compartment:a,apparatus:new Set([d]),occurrences:1})}}}),Array.from(r.entries()).filter(([,c])=>c.occurrences>=2).map(([c,o])=>({item:c.split(":")[1],compartment:o.compartment,apparatus:Array.from(o.apparatus),occurrences:o.occurrences})).sort((c,o)=>o.occurrences-c.occurrences)}catch(t){throw console.error("Error analyzing low stock items:",t),t}}async sendNotification(t){try{const e=await fetch(`${u}/notify`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify(t)});if(!e.ok)throw new Error("Failed to send notification");return e.json()}catch(e){throw console.error("Error sending notification:",e),e}}async getEmailConfig(t){try{const e=await fetch(`${u}/config/email`,{method:"GET",headers:{"X-Admin-Password":t}});if(!e.ok)throw e.status===401?new Error("Unauthorized"):new Error("Failed to fetch email configuration");return e.json()}catch(e){throw console.error("Error fetching email config:",e),e}}async updateEmailConfig(t,e){try{const s=await fetch(`${u}/config/email`,{method:"PUT",headers:{"Content-Type":"application/json","X-Admin-Password":t},body:JSON.stringify(e)});if(!s.ok)throw s.status===401?new Error("Unauthorized"):new Error("Failed to update email configuration");return s.json()}catch(s){throw console.error("Error updating email config:",s),s}}async sendManualDigest(t){const e=await fetch(`${u}/digest/send`,{method:"POST",headers:{"X-Admin-Password":t}});if(!e.ok)throw e.status===401?new Error("Unauthorized"):new Error("Failed to send digest");return e.json()}async getAIInsights(t,e="week",s){const r=new URLSearchParams({timeframe:e,...s&&{apparatus:s}}),i=await fetch(`${u}/analyze?${r}`,{method:"GET",headers:{"X-Admin-Password":t}});if(!i.ok)throw i.status===401?new Error("Unauthorized"):i.status===503?new Error("AI features not enabled"):new Error("Failed to fetch AI insights");return i.json()}async createSupplyTasksForDefects(t,e){try{const s=await fetch(`${u}/tasks/create`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({defects:t,apparatus:e})});if(!s.ok)throw new Error(`Failed to create supply tasks: ${s.statusText}`);const r=await s.json();console.log(`Created ${r.tasksCreated||0} supply tasks from ${t.length} defects`)}catch(s){throw console.error("Error creating supply tasks:",s),s}}}const v=new I,y="https://mbfd-github-proxy.pdarleyjr.workers.dev/api";function g(l=!1){const t={"Content-Type":"application/json"};if(l){const e=localStorage.getItem("adminPassword");e&&(t["X-Admin-Password"]=e)}return t}async function O(){const l=await fetch(`${y}/inventory`,{method:"GET",headers:g(!0)});if(!l.ok){const t=await l.json().catch(()=>({error:"Unknown error"}));throw new Error(t.error||`Failed to fetch inventory: ${l.statusText}`)}return await l.json()}async function U(l="pending"){const t=await fetch(`${y}/tasks?status=${l}`,{method:"GET",headers:g(!0)});if(!t.ok){const e=await t.json().catch(()=>({error:"Unknown error"}));throw new Error(e.error||`Failed to fetch tasks: ${t.statusText}`)}return await t.json()}async function R(l){const t=await fetch(`${y}/tasks`,{method:"POST",headers:{"Content-Type":"application/json",...g(!1)},body:JSON.stringify({tasks:l})});if(!t.ok){const e=await t.json().catch(()=>({error:"Unknown error"}));throw new Error(e.error||`Failed to create tasks: ${t.statusText}`)}return await t.json()}async function N(l,t){const e=await fetch(`${y}/tasks/${l}`,{method:"PATCH",headers:{"Content-Type":"application/json",...g(!0)},body:JSON.stringify(t)});if(!e.ok){const s=await e.json().catch(()=>({error:"Unknown error"}));throw new Error(s.error||`Failed to update task: ${e.statusText}`)}return await e.json()}async function H(l){const t=await fetch(`${y}/ai/inventory-insights`,{method:"POST",headers:{"Content-Type":"application/json",...g(!0)},body:JSON.stringify({tasks:l.tasks?.map(e=>({id:e.id,apparatus:e.apparatus,itemName:e.itemName,deficiencyType:e.deficiencyType})),inventory:l.inventory?.map(e=>({id:e.id,equipmentName:e.equipmentName,quantity:e.quantity,minQty:e.minQty}))})});if(!t.ok){if(t.status===501)return{ok:!1,message:"AI integration not configured"};const e=await t.json().catch(()=>({error:"Unknown error"}));throw new Error(e.error||`Failed to generate insights: ${t.statusText}`)}return await t.json()}async function G(){const l=await fetch(`${y}/ai/insights`,{method:"GET",headers:g(!0)});if(!l.ok){const t=await l.json().catch(()=>({error:"Unknown error"}));throw new Error(t.error||`Failed to fetch insights: ${l.statusText}`)}return await l.json()}export{_ as C,M as T,x as X,L as a,O as b,R as c,G as d,H as e,U as f,v as g,N as u};
//# sourceMappingURL=inventory-Du1T9Q36.js.map
