import{c as w,b as g,L as u,D as y,A as $}from"./config-CrA28sVH.js";import{r as b,j as l}from"./index-CSExyLD3.js";const E=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],S=w("circle-check-big",E);const x=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],D=w("x",x),v=({isOpen:p,onClose:e,title:t,children:r,className:s})=>(b.useEffect(()=>(p?document.body.style.overflow="hidden":document.body.style.overflow="unset",()=>{document.body.style.overflow="unset"}),[p]),p?l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center",children:[l.jsx("div",{className:"absolute inset-0 bg-black/50 backdrop-blur-sm",onClick:e}),l.jsxs("div",{className:g("relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",s),children:[l.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-gray-200",children:[l.jsx("h2",{className:"text-xl font-semibold text-gray-900",children:t}),l.jsx("button",{onClick:e,className:"p-1 hover:bg-gray-100 rounded-lg transition-colors",children:l.jsx(D,{className:"w-5 h-5 text-gray-500"})})]}),l.jsx("div",{className:"px-6 py-4",children:r})]})]}):null),h="https://mbfd-github-proxy.pdarleyjr.workers.dev/api";class k{adminPassword=null;constructor(){}setAdminPassword(e){this.adminPassword=e}clearAdminPassword(){this.adminPassword=null}isAdminAuthenticated(){return this.adminPassword!==null}getHeaders(e=!1){const t={"Content-Type":"application/json"};return e&&this.adminPassword&&(t["X-Admin-Password"]=this.adminPassword),t}async checkExistingDefects(e){try{const t=await fetch(`${h}/issues?state=open&labels=${u.DEFECT},${encodeURIComponent(e)}&per_page=100`,{method:"GET",headers:this.getHeaders()});if(!t.ok)return console.warn(`Failed to fetch defects: ${t.statusText}`),new Map;const r=await t.json(),s=Array.isArray(r)?r:[],c=new Map;for(const i of s){const a=i.title.match(y);if(a){const[,,o,n]=a,m=`${o}:${n}`;c.set(m,i)}}return c}catch(t){return console.error("Error fetching existing defects:",t),new Map}}async submitChecklist(e){const{user:t,apparatus:r,date:s,defects:c}=e,i=await this.checkExistingDefects(r);let a=0;const o=[];for(const n of c)try{const m=`${n.compartment}:${n.item}`,d=i.get(m);d?await this.addCommentToDefect(d.number,t.name,t.rank,s,n.notes):await this.createDefectIssue(r,n.compartment,n.item,n.status,n.notes,t.name,t.rank,s)}catch(m){a++;const d=`${n.compartment}: ${n.item}`;o.push(d),console.error(`Failed to process defect ${d}:`,m)}if(a>0)throw new Error(`Failed to submit ${a} defect(s): ${o.join(", ")}. Please try again.`);await this.createLogEntry(e)}async createDefectIssue(e,t,r,s,c,i,a,o){const n=`[${e}] ${t}: ${r} - ${s==="missing"?"Missing":"Damaged"}`,m=`
## Defect Report

**Apparatus:** ${e}
**Compartment:** ${t}
**Item:** ${r}
**Status:** ${s==="missing"?"❌ Missing":"⚠️ Damaged"}
**Reported By:** ${i} (${a})
**Date:** ${o}

### Notes
${c}

---
*This issue was automatically created by the MBFD Checkout System.*
    `.trim(),d=[u.DEFECT,e];s==="damaged"&&d.push(u.DAMAGED);try{const f=await fetch(`${h}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:n,body:m,labels:d})});if(!f.ok)throw new Error(`Failed to create issue: ${f.statusText}`)}catch(f){throw console.error("Error creating defect issue:",f),f}}async addCommentToDefect(e,t,r,s,c){const i=`
### Verification Update

**Verified still present by:** ${t} (${r})
**Date:** ${s}

${c?`**Additional Notes:** ${c}`:""}

---
*This comment was automatically added by the MBFD Checkout System.*
    `.trim();try{const a=await fetch(`${h}/issues/${e}/comments`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({body:i})});if(!a.ok)throw new Error(`Failed to add comment: ${a.statusText}`)}catch(a){throw console.error("Error adding comment to issue:",a),a}}async createLogEntry(e){const{user:t,apparatus:r,date:s,items:c}=e,i=`[${r}] Daily Inspection - ${s}`,a=`
## Daily Inspection Log

**Apparatus:** ${r}
**Conducted By:** ${t.name} (${t.rank})
**Date:** ${s}

### Summary
- **Total Items Checked:** ${c.length}
- **Issues Found:** ${e.defects.length}

${e.defects.length>0?`
### Issues Reported
${e.defects.map(o=>`- ${o.compartment}: ${o.item} - ${o.status==="missing"?"❌ Missing":"⚠️ Damaged"}`).join(`
`)}`:"✅ All items present and working"}

---
*This inspection log was automatically created by the MBFD Checkout System.*
    `.trim();try{const o=await fetch(`${h}/issues`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({title:i,body:a,labels:[u.LOG,r]})});if(!o.ok)throw new Error(`Failed to create log: ${o.statusText}`);const n=await o.json();await fetch(`${h}/issues/${n.number}`,{method:"PATCH",headers:this.getHeaders(),body:JSON.stringify({state:"closed"})})}catch(o){throw console.error("Error creating log entry:",o),o}}async getAllDefects(){try{const e=await fetch(`${h}/issues?state=open&labels=${u.DEFECT}&per_page=100`,{method:"GET",headers:this.getHeaders(!0)});if(!e.ok)throw e.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to fetch defects: ${e.statusText}`);const t=await e.json();return(Array.isArray(t)?t:[]).map(s=>this.parseDefectFromIssue(s))}catch(e){throw console.error("Error fetching all defects:",e),e}}parseDefectFromIssue(e){const t=e.title.match(y);let r="Rescue 1",s="Unknown",c="Unknown",i="missing";return t&&(r=t[1],s=t[2],c=t[3],i=t[4].toLowerCase()),{issueNumber:e.number,apparatus:r,compartment:s,item:c,status:i,notes:e.body||"",reportedBy:e.user?.login||"Unknown",reportedAt:e.created_at,updatedAt:e.updated_at,resolved:!1}}async resolveDefect(e,t,r){try{await fetch(`${h}/issues/${e}/comments`,{method:"POST",headers:this.getHeaders(!0),body:JSON.stringify({body:`
## ✅ Defect Resolved

**Resolved By:** ${r}
**Date:** ${new Date().toISOString()}

### Resolution
${t}

---
*This defect was marked as resolved via the MBFD Admin Dashboard.*
          `.trim()})});const s=await fetch(`${h}/issues/${e}`,{method:"PATCH",headers:this.getHeaders(!0),body:JSON.stringify({state:"closed",labels:[u.DEFECT,u.RESOLVED]})});if(!s.ok)throw s.status===401?new Error("Unauthorized. Please enter the admin password."):new Error(`Failed to resolve defect: ${s.statusText}`)}catch(s){throw console.error("Error resolving defect:",s),s}}async getFleetStatus(){const e=await this.getAllDefects();return this.computeFleetStatus(e)}computeFleetStatus(e){const t=new Map;for(const r of $)t.set(r,0);return e.forEach(r=>{const s=t.get(r.apparatus)||0;t.set(r.apparatus,s+1)}),t}}const C=new k;export{S as C,v as M,D as X,C as g};
//# sourceMappingURL=github-jO65g4cw.js.map
