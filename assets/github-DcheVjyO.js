import{c as w,b as $,L as u,D as y,A as g}from"./config-LfSWU5Wc.js";import{r as D,j as p}from"./index-CtoGeVPC.js";const E=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],v=w("calendar",E);const b=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],L=w("circle-check-big",b);const k=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],F=w("triangle-alert",k);const S=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],x=w("x",S),I=({isOpen:f,onClose:e,title:t,children:r,className:s})=>(D.useEffect(()=>(f?document.body.style.overflow="hidden":document.body.style.overflow="unset",()=>{document.body.style.overflow="unset"}),[f]),f?p.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center",children:[p.jsx("div",{className:"absolute inset-0 bg-black/50 backdrop-blur-sm",onClick:e}),p.jsxs("div",{className:$("relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",s),children:[p.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-gray-200",children:[p.jsx("h2",{className:"text-xl font-semibold text-gray-900",children:t}),p.jsx("button",{onClick:e,className:"p-1 hover:bg-gray-100 rounded-lg transition-colors",children:p.jsx(x,{className:"w-5 h-5 text-gray-500"})})]}),p.jsx("div",{className:"px-6 py-4",children:r})]})]}):null),m="https://mbfd-github-proxy.pdarleyjr.workers.dev/api";class T{adminPassword=null;constructor(){}setAdminPassword(e){this.adminPassword=e}clearAdminPassword(){this.adminPassword=null}isAdminAuthenticated(){return this.adminPassword!==null}getHeaders(e=!1){const t={"Content-Type":"application/json"};return e&&this.adminPassword&&(t["X-Admin-Password"]=this.adminPassword),t}async checkExistingDefects(e){try{const t=await fetch(`${m}/issues?state=open&labels=${u.DEFECT},${encodeURIComponent(e)}&per_page=100`,{method:"GET",headers:this.getHeaders()});if(!t.ok)return console.warn(`Failed to fetch defects: ${t.statusText}`),new Map;const r=await t.json(),s=Array.isArray(r)?r:[],i=new Map;for(const c of s){const a=c.title.match(y);if(a){const[,,n,o]=a,d=`${n}:${o}`;i.set(d,c)}}return i}catch(t){return console.error("Error fetching existing defects:",t),new Map}}async submitChecklist(e){const{user:t,apparatus:r,date:s,defects:i}=e,c=await this.checkExistingDefects(r);let a=0;const n=[];for(const o of i)try{const d=`${o.compartment}:${o.item}`,l=c.get(d);l?await this.addCommentToDefect(l.number,t.name,t.rank,s,o.notes):await this.createDefectIssue(r,o.compartment,o.item,o.status,o.notes,t.name,t.rank,s)}catch(d){a++;const l=`${o.compartment}: ${o.item}`;n.push(l),console.error(`Failed to process defect ${l}:`,d)}if(a>0)throw new Error(`Failed to submit ${a} defect(s): ${n.join(", ")}. Please try again.`);await this.createLogEntry(e)}async createDefectIssue(e,t,r,s,i,c,a,n){const o=`[${e}] ${t}: ${r} - ${s==="missing"?"Missing":"Damaged"}`,d=`
## Defect Report

**Apparatus:** ${e}
**Compartment:** ${t}
**Item:** ${r}
**Status:** ${s==="missing"?"❌ Missing":"⚠️ Damaged"}
**Reported By:** ${c} (${a})
**Date:** ${n}

### Notes
${i}

---
*This issue was automatically created by the MBFD Checkout System.*
    `.trim(),l=[u.DEFECT,e];s==="damaged"&&l.push(u.DAMAGED);try{const h=await fetch(`${m}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:o,body:d,labels:l})});if(!h.ok)throw new Error(`Failed to create issue: ${h.statusText}`)}catch(h){throw console.error("Error creating defect issue:",h),h}}async addCommentToDefect(e,t,r,s,i){const c=`
### Verification Update

**Verified still present by:** ${t} (${r})
**Date:** ${s}

${i?`**Additional Notes:** ${i}`:""}

---
*This comment was automatically added by the MBFD Checkout System.*
    `.trim();try{const a=await fetch(`${m}/issues/${e}/comments`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({body:c})});if(!a.ok)throw new Error(`Failed to add comment: ${a.statusText}`)}catch(a){throw console.error("Error adding comment to issue:",a),a}}async createLogEntry(e){const{user:t,apparatus:r,date:s,items:i}=e,c=`[${r}] Daily Inspection - ${s}`,a=`
## Daily Inspection Log

**Apparatus:** ${r}
**Conducted By:** ${t.name} (${t.rank})
**Date:** ${s}

### Summary
- **Total Items Checked:** ${i.length}
- **Issues Found:** ${e.defects.length}

${e.defects.length>0?`
### Issues Reported
${e.defects.map(n=>`- ${n.compartment}: ${n.item} - ${n.status==="missing"?"❌ Missing":"⚠️ Damaged"}`).join(`
`)}`:"✅ All items present and working"}

---
*This inspection log was automatically created by the MBFD Checkout System.*
    `.trim();try{const n=await fetch(`${m}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:c,body:a,labels:[u.LOG,r]})});if(!n.ok)throw new Error(`Failed to create log: ${n.statusText}`);const o=await n.json();await fetch(`${m}/issues/${o.number}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({state:"closed"})})}catch(n){throw console.error("Error creating log entry:",n),n}}async getAllDefects(){try{const e=await fetch(`${m}/issues?state=open&labels=${u.DEFECT}&per_page=100`,{method:"GET",headers:this.getHeaders(!0)});if(!e.ok)throw e.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch defects: ${e.statusText}`);const t=await e.json();return(Array.isArray(t)?t:[]).map(s=>this.parseDefectFromIssue(s))}catch(e){throw console.error("Error fetching all defects:",e),e}}parseDefectFromIssue(e){const t=e.title.match(y);let r="Rescue 1",s="Unknown",i="Unknown",c="missing";return t&&(r=t[1],s=t[2],i=t[3],c=t[4].toLowerCase()),{issueNumber:e.number,apparatus:r,compartment:s,item:i,status:c,notes:e.body||"",reportedBy:e.user?.login||"Unknown",reportedAt:e.created_at,updatedAt:e.updated_at,resolved:!1}}async resolveDefect(e,t,r){try{const s=await fetch(`${m}/issues/${e}`,{method:"GET",headers:this.getHeaders(!0)});if(!s.ok)throw new Error(`Failed to fetch issue details: ${s.statusText}`);const a=(await s.json()).labels.map(d=>d.name).find(d=>g.includes(d)),n=[u.DEFECT,u.RESOLVED];a&&n.push(a),await fetch(`${m}/issues/${e}/comments`,{method:"POST",headers:this.getHeaders(!0),body:JSON.stringify({body:`
## ✅ Defect Resolved

**Resolved By:** ${r}
**Date:** ${new Date().toISOString()}

### Resolution
${t}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
          `.trim()})});const o=await fetch(`${m}/issues/${e}`,{method:"PATCH",headers:this.getHeaders(!0),body:JSON.stringify({state:"closed",labels:n})});if(!o.ok)throw o.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to resolve defect: ${o.statusText}`)}catch(s){throw console.error("Error resolving defect:",s),s}}async getFleetStatus(){const e=await this.getAllDefects();return this.computeFleetStatus(e)}computeFleetStatus(e){const t=new Map;for(const r of g)t.set(r,0);return e.forEach(r=>{const s=t.get(r.apparatus)||0;t.set(r.apparatus,s+1)}),t}async getInspectionLogs(e=7){try{const t=new Date;t.setDate(t.getDate()-e);const r=await fetch(`${m}/issues?state=closed&labels=${u.LOG}&per_page=100&since=${t.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!r.ok)throw r.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch logs: ${r.statusText}`);const s=await r.json();return Array.isArray(s)?s:[]}catch(t){throw console.error("Error fetching inspection logs:",t),t}}async getDailySubmissions(){try{const e=await this.getInspectionLogs(1),t=await this.getInspectionLogs(30),r=new Date().toLocaleDateString("en-US"),s=[],i=new Map,c=new Map;return g.forEach(a=>{i.set(a,0)}),t.forEach(a=>{const n=a.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const o=n[1],d=i.get(o)||0;i.set(o,d+1);const l=new Date(a.created_at).toLocaleDateString("en-US"),h=c.get(o);(!h||new Date(a.created_at)>new Date(h))&&c.set(o,l)}}),e.forEach(a=>{const n=a.title.match(/\[(.+)\]\s+Daily Inspection/);if(n){const o=n[1];new Date(a.created_at).toLocaleDateString("en-US")===r&&!s.includes(o)&&s.push(o)}}),{today:s,totals:i,lastSubmission:c}}catch(e){throw console.error("Error getting daily submissions:",e),e}}async analyzeLowStockItems(){try{const e=new Date;e.setDate(e.getDate()-30);const t=await fetch(`${m}/issues?state=all&labels=${u.DEFECT}&per_page=100&since=${e.toISOString()}`,{method:"GET",headers:this.getHeaders(!0)});if(!t.ok)throw new Error(`Failed to fetch defects for analysis: ${t.statusText}`);const r=await t.json(),s=new Map;return r.forEach(c=>{if(c.title.includes("Missing")){const a=c.title.match(y);if(a){const[,n,o,d]=a,l=`${o}:${d}`;if(s.has(l)){const h=s.get(l);h.apparatus.add(n),h.occurrences++}else s.set(l,{compartment:o,apparatus:new Set([n]),occurrences:1})}}}),Array.from(s.entries()).filter(([,c])=>c.occurrences>=2).map(([c,a])=>({item:c.split(":")[1],compartment:a.compartment,apparatus:Array.from(a.apparatus),occurrences:a.occurrences})).sort((c,a)=>a.occurrences-c.occurrences)}catch(e){throw console.error("Error analyzing low stock items:",e),e}}}const C=new T;export{v as C,I as M,F as T,x as X,L as a,C as g};
//# sourceMappingURL=github-DcheVjyO.js.map
