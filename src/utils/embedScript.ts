/**
 * EntryWise Lightweight Auto-Binder Script (/embed.js)
 * < 1.5KB gzipped, zero dependencies, supports:
 * - Default class binding: class="entrywise-form" or class="ew-form" or [data-entrywise]
 * - Custom class binding: <script src=".../embed.js" data-class="my-custom-form" data-site-key="ew_live_...">
 * - Self-hosted origin auto-detection from <script src="..."> or explicit data-endpoint="https://..."
 * - Programmatic API: window.EntryWise.bind('.my-class', { siteKey, endpoint, successMessage })
 */
export const EMBED_SCRIPT_JS = `(function(w,d){
  var cs=d.currentScript;
  var cfg=w.EntryWiseConfig||{};
  var scriptOrigin='https://api.entrywise.si';
  try{if(cs&&cs.src)scriptOrigin=new URL(cs.src).origin;}catch(e){}
  var defaultEndpoint=(cs&&cs.getAttribute('data-endpoint'))||cfg.endpoint||scriptOrigin;
  var defaultKey=(cs&&cs.getAttribute('data-site-key'))||cfg.siteKey||'';
  var customClass=(cs&&(cs.getAttribute('data-class')||cs.getAttribute('data-form-class')))||cfg.className||'';

  function resolveUrl(form,opts){
    opts=opts||{};
    var action=form.getAttribute('action');
    if(action&&action.indexOf('/f/')!==-1)return action;
    var ep=(opts.endpoint||form.getAttribute('data-endpoint')||defaultEndpoint).replace(/\\/+$/,'');
    var key=opts.siteKey||form.getAttribute('data-site-key')||defaultKey;
    return key?ep+'/f/'+encodeURIComponent(key):(action||ep);
  }

  function showStatus(form,msg,isErr){
    var el=form.querySelector('[data-ew-status]');
    if(!el){
      el=d.createElement('div');
      el.setAttribute('data-ew-status','');
      el.style.cssText='margin-top:12px;padding:10px 14px;border-radius:8px;font-size:14px;line-height:1.4;transition:opacity .2s;';
      form.appendChild(el);
    }
    el.style.background=isErr?'rgba(239,68,68,0.12)':'rgba(16,185,129,0.12)';
    el.style.color=isErr?'#ef4444':'#10b981';
    el.style.border=isErr?'1px solid rgba(239,68,68,0.3)':'1px solid rgba(16,185,129,0.3)';
    el.textContent=msg;
  }

  function bindForm(form,opts){
    if(!form||form.__ewBound)return;
    form.__ewBound=true;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var url=resolveUrl(form,opts);
      if(!url||url.indexOf('/f/')===-1){
        showStatus(form,'EntryWise error: Missing data-site-key or form action URL.',true);
        return;
      }
      var btn=form.querySelector('[type="submit"],button:not([type="button"])');
      var origText=btn?btn.innerHTML:'';
      if(btn){
        btn.disabled=true;
        btn.textContent=form.getAttribute('data-loading-text')||'Sending...';
      }
      var fd=new FormData(form);
      fetch(url,{method:'POST',body:fd,headers:{'Accept':'application/json'}})
        .then(function(r){return r.json().then(function(b){return{ok:r.ok,body:b};});})
        .then(function(res){
          if(!res.ok)throw new Error((res.body&&(res.body.detail||res.body.error||res.body.title))||'Submission failed');
          form.reset();
          var redir=(opts&&opts.redirect)||form.getAttribute('data-redirect')||(res.body&&res.body.redirect);
          if(redir){w.location.href=redir;return;}
          var msg=(opts&&opts.successMessage)||form.getAttribute('data-success')||'Thank you! Your submission has been received.';
          showStatus(form,msg,false);
          form.dispatchEvent(new CustomEvent('entrywise:success',{detail:res.body,bubbles:true}));
        })
        .catch(function(err){
          var msg=(opts&&opts.errorMessage)||form.getAttribute('data-error')||err.message||'Something went wrong. Please try again.';
          showStatus(form,msg,true);
          form.dispatchEvent(new CustomEvent('entrywise:error',{detail:err,bubbles:true}));
        })
        .finally(function(){
          if(btn){btn.disabled=false;btn.innerHTML=origText;}
        });
    });
  }

  function bindAll(selector,opts){
    var sel=selector||['.entrywise-form','.ew-form','form[data-entrywise]'].concat(customClass?['.'+customClass.replace(/^\\./,'')]:[]).join(',');
    var forms=d.querySelectorAll(sel);
    for(var i=0;i<forms.length;i++)bindForm(forms[i],opts);
  }

  w.EntryWise={bind:bindAll,bindForm:bindForm};
  if(d.readyState==='loading'){d.addEventListener('DOMContentLoaded',function(){bindAll();});}
  else{bindAll();}
})(window,document);
`;
