import{c as w,b as $,L as u,D as y,A as g}from"./config-mspnhQU1.js";import{r as E,j as f}from"./index-DyV6w0vC.js";const D=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],M=w("calendar",D);const b=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],j=w("circle-check-big",b);const k=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],v=w("triangle-alert",k);const S=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],T=w("x",S),C=({isOpen:p,onClose:t,title:e,children:s,className:r})=>(E.useEffect(()=>(p?document.body.style.overflow="hidden":document.body.style.overflow="unset",()=>{document.body.style.overflow="unset"}),[p]),p?f.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center",children:[f.jsx("div",{className:"absolute inset-0 bg-black/50 backdrop-blur-sm",onClick:t}),f.jsxs("div",{className:$("relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",r),children:[f.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-gray-200",children:[f.jsx("h2",{className:"text-xl font-semibold text-gray-900",children:e}),f.jsx("button",{onClick:t,className:"p-1 hover:bg-gray-100 rounded-lg transition-colors",children:f.jsx(T,{className:"w-5 h-5 text-gray-500"})})]}),f.jsx("div",{className:"px-6 py-4",children:s})]})]}):null),l="https://mbfd-github-proxy.pdarleyjr.workers.dev/api";class x{adminPassword=null;constructor(){}setAdminPassword(t){this.adminPassword=t}clearAdminPassword(){this.adminPassword=null}isAdminAuthenticated(){return this.adminPassword!==null}getHeaders(t=!1){const e={"Content-Type":"application/json"};return t&&this.adminPassword&&(e["X-Admin-Password"]=this.adminPassword),e}async checkExistingDefects(t){try{const e=await fetch(`${l}/issues?state=open&labels=${u.DEFECT},${encodeURIComponent(t)}&per_page=100`,{method:"GET",headers:this.getHeaders()});if(!e.ok)return console.warn(`Failed to fetch defects: ${e.statusText}`),new Map;const s=await e.json(),r=Array.isArray(s)?s:[],i=new Map;for(const c of r){const o=c.title.match(y);if(o){const[,,n,a]=o,d=`${n}:${a}`;i.set(d,c)}}return i}catch(e){return console.error("Error fetching existing defects:",e),new Map}}async submitChecklist(t){const{user:e,apparatus:s,date:r,defects:i}=t,c=await this.checkExistingDefects(s);let o=0;const n=[];for(const a of i)try{const d=`${a.compartment}:${a.item}`,h=c.get(d);h?await this.addCommentToDefect(h.number,e.name,e.rank,r,a.notes):await this.createDefectIssue(s,a.compartment,a.item,a.status,a.notes,e.name,e.rank,r)}catch(d){o++;const h=`${a.compartment}: ${a.item}`;n.push(h),console.error(`Failed to process defect ${h}:`,d)}if(o>0)throw new Error(`Failed to submit ${o} defect(s): ${n.join(", ")}. Please try again.`);await this.createLogEntry(t)}async createDefectIssue(t,e,s,r,i,c,o,n){const a=`[${t}] ${e}: ${s} - ${r==="missing"?"Missing":"Damaged"}`,d=`
## Defect Report

**Apparatus:** ${t}
**Compartment:** ${e}
**Item:** ${s}
**Status:** ${r==="missing"?"❌ Missing":"⚠️ Damaged"}
**Reported By:** ${c} (${o})
**Date:** ${n}

### Notes
${i}

---
*This issue was automatically created by the MBFD Checkout System.*
`.trim(),h=[u.DEFECT,t];r==="damaged"&&h.push(u.DAMAGED);try{const m=await fetch(`${l}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:a,body:d,labels:h})});if(!m.ok)throw new Error(`Failed to create issue: ${m.statusText}`)}catch(m){throw console.error("Error creating defect issue:",m),m}}async addCommentToDefect(t,e,s,r,i){const c=`
### Verification Update

**Verified still present by:** ${e} (${s})
**Date:** ${r}

${i?`**Additional Notes:** ${i}`:""}

---
*This comment was automatically added by the MBFD Checkout System.*
`.trim();try{const o=await fetch(`${l}/issues/${t}/comments`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({body:c})});if(!o.ok)throw new Error(`Failed to add comment: ${o.statusText}`)}catch(o){throw console.error("Error adding comment to issue:",o),o}}async createLogEntry(t){const{user:e,apparatus:s,date:r,items:i}=t,c=`[${s}] Daily Inspection - ${r}`,o=`
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
`)}`:"✅ All items present and working"}}

---
*This inspection log was automatically created by the MBFD Checkout System.*
`.trim();try{const n=await fetch(`${l}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:c,body:o,labels:[u.LOG,s]})});if(!n.ok)throw new Error(`Failed to create log: ${n.statusText}`);const a=await n.json();await fetch(`${l}/issues/${a.number}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({state:"closed"})})}catch(n){throw console.error("Error creating log entry:",n),n}}async getAllDefects(){try{const t=await fetch(`${l}/issues?state=open&labels=${u.DEFECT}&per_page=100`,{method:"GET",headers:this.getHeaders(!0)});if(!t.ok)throw t.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch defects: ${t.statusText}`);const e=await t.json();return(Array.isArray(e)?e:[]).map(r=>this.parseDefectFromIssue(r))}catch(t){throw console.error("Error fetching all defects:",t),t}}parseDefectFromIssue(t){const e=t.title.match(y);let s="Rescue 1",r="Unknown",i="Unknown",c="missing";return e&&(s=e[1],r=e[2],i=e[3],c=e[4].toLowerCase()),{issueNumber:t.number,apparatus:s,compartment:r,item:i,status:c,notes:t.body||"",reportedBy:t.user?.login||"Unknown",reportedAt:t.created_at,updatedAt:t.updated_at,resolved:!1}}async resolveDefect(t,e,s){try{const r=await fetch(`${l}/issues/${t}`,{method:"GET",headers:this.getHeaders(!0)});if(!r.ok)throw new Error(`Failed to fetch issue details: ${r.statusText}`);const o=(await r.json()).labels.map(d=>d.name).find(d=>g.includes(d)),n=[u.DEFECT,u.RESOLVED];o&&n.push(o),await fetch(`${l}/issues/${t}/comments`,{method:"POST",headers:this.getHeaders(!0),body:JSON.stringify({body:`
## ✅ Defect Resolved

**Resolved By:** ${s}
**Date:** ${new Date().toISOString()}

### Resolution
${e}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
`.trim()})});const a=await fetch(`${l}/issues/${t}`,{method:"PATCH",headers:this.getHeaders(!0),body:JSON.stringify({state:"closed",labels:n})});if(!a.ok)throw a.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to resolve defect: ${a.statusText}`)}catch(r){throw console.error("Error resolving defect:",r),r}}async getFleetStatus(){const t=await this.getAllDefects();return this.computeFleetStatus(t)}computeFleetStatus(t){const e=new Map;for(const s of g)e.set(s,0);return t.forEach(s=>{const r=e.get(s.apparatus)||0;e.set(s.apparatus,r+1)}),e}async getInspectionLogs(t=7){try{const e=new Date;e.setDate(e.getDate()-t);const s=await fetch(`${l}/issues?state=closed&labels=${u.LOG}&per_page=100&since=${e.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!s.ok)throw s.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch logs: ${s.statusText}`);const r=await s.json();return Array.isArray(r)?r:[]}catch(e){throw console.error("Error fetching inspection logs:",e),e}}async getDailySubmissions(){try{const t=await this.getInspectionLogs(1),e=await this.getInspectionLogs(30),s=new Date().toLocaleDateString("en-US"),r=[],i=new Map,c=new Map;return g.forEach(o=>{i.set(o,0)}),e.forEach(o=>{const n=o.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const a=n[1],d=i.get(a)||0;i.set(a,d+1);const h=new Date(o.created_at).toLocaleDateString("en-US"),m=c.get(a);(!m||new Date(o.created_at)>new Date(m))&&c.set(a,h)}}),t.forEach(o=>{const n=o.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const a=n[1];new Date(o.created_at).toLocaleDateString("en-US")===s&&!r.includes(a)&&r.push(a)}}),{today:r,totals:i,lastSubmission:c}}catch(t){throw console.error("Error getting daily submissions:",t),t}}async analyzeLowStockItems(){try{const t=new Date;t.setDate(t.getDate()-30);const e=await fetch(`${l}/issues?state=all&labels=${u.DEFECT}&per_page=100&since=${t.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!e.ok)throw new Error(`Failed to fetch defects for analysis: ${e.statusText}`);const s=await e.json(),r=new Map;return s.forEach(c=>{if(c.title.includes("Missing")){const o=c.title.match(y);if(o){const[,n,a,d]=o,h=`${a}:${d}`;if(r.has(h)){const m=r.get(h);m.apparatus.add(n),m.occurrences++}else r.set(h,{compartment:a,apparatus:new Set([n]),occurrences:1})}}}),Array.from(r.entries()).filter(([,c])=>c.occurrences>=2).map(([c,o])=>({item:c.split(":")[1],compartment:o.compartment,apparatus:Array.from(o.apparatus),occurrences:o.occurrences})).sort((c,o)=>o.occurrences-c.occurrences)}catch(t){throw console.error("Error analyzing low stock items:",t),t}}async sendNotification(t){try{const e=await fetch(`${l}/notify`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify(t)});if(!e.ok)throw new Error("Failed to send notification");return e.json()}catch(e){throw console.error("Error sending notification:",e),e}}async getEmailConfig(t){try{const e=await fetch(`${l}/config/email`,{method:"GET",headers:{"X-Admin-Password":t}});if(!e.ok)throw e.status===401?new Error("Unauthorized"):new Error("Failed to fetch email configuration");return e.json()}catch(e){throw console.error("Error fetching email config:",e),e}}async updateEmailConfig(t,e){try{const s=await fetch(`${l}/config/email`,{method:"PUT",headers:{"Content-Type":"application/json","X-Admin-Password":t},body:JSON.stringify(e)});if(!s.ok)throw s.status===401?new Error("Unauthorized"):new Error("Failed to update email configuration");return s.json()}catch(s){throw console.error("Error updating email config:",s),s}}async sendManualDigest(t){try{const e=await fetch(`${l}/digest/send`,{method:"POST",headers:{"X-Admin-Password":t}});if(!e.ok)throw e.status===401?new Error("Unauthorized"):new Error("Failed to send digest");return e.json()}catch(e){throw console.error("Error sending manual digest:",e),e}}}const L=new x;export{M as C,C as M,v as T,T as X,j as a,L as g};
//# sourceMappingURL=github-DEal1J8j.js.map
