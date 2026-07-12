(function() {
  var PANEL_ID = 'pm-panel';
  var BTN_ID = 'pm-btn';
  var DROPDOWN_ID = 'pm-dropdown';
  var STORAGE_KEY = 'pm-panel-size';
  var MIN_W = 400;
  var MIN_H = 300;

  function getApi() {
    return window.promptManagerAPI || window.__promptManagerAPI;
  }

  var CSS = [
    '#'+BTN_ID+'{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 8px;border-radius:6px;cursor:pointer;background:transparent;border:none;color:var(--color-text-base,#ccc);font-size:13px;gap:4px;transition:background .15s}',
    '#'+BTN_ID+':hover{background:var(--color-bg-hover,rgba(255,255,255,.08))}',
    '#'+BTN_ID+' svg{width:16px;height:16px}',
    '#'+PANEL_ID+'{position:fixed;z-index:99999;width:600px;height:800px;background:var(--color-surface-raised,#1e1e2e);border:1px solid var(--color-border,rgba(255,255,255,.1));border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.4);display:none;flex-direction:column;overflow:hidden;font-family:var(--font-family-sans,Inter,sans-serif);color:var(--color-text-base,#e0e0e0)}',
    '#'+PANEL_ID+'.open{display:flex}',
    '#'+PANEL_ID+' .pm-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--color-border,rgba(255,255,255,.08))}',
    '#'+PANEL_ID+' .pm-hd h3{margin:0;font-size:14px;font-weight:600}',
    '#'+PANEL_ID+' .pm-x{background:none;border:none;color:inherit;cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px}',
    '#'+PANEL_ID+' .pm-x:hover{background:rgba(255,255,255,.08)}',
    '#'+PANEL_ID+' .pm-bd{flex:1;overflow-y:auto;padding:8px 0}',
    '#'+PANEL_ID+' .pm-st{font-size:11px;font-weight:600;text-transform:uppercase;color:var(--color-text-weak,#888);letter-spacing:.5px;margin:8px 16px 4px}',
    '#'+PANEL_ID+' .pm-it{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:6px;margin:0 8px;transition:background .1s}',
    '#'+PANEL_ID+' .pm-it:hover{background:rgba(255,255,255,.04)}',
    '#'+PANEL_ID+' .pm-inf{flex:1;min-width:0}',
    '#'+PANEL_ID+' .pm-nm{font-size:13px;font-weight:500}',
    '#'+PANEL_ID+' .pm-ds{font-size:11px;color:var(--color-text-weak,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#'+PANEL_ID+' .pm-tg{position:relative;width:36px;height:20px;flex-shrink:0;background:rgba(255,255,255,.15);border-radius:10px;cursor:pointer;border:none;transition:background .2s}',
    '#'+PANEL_ID+' .pm-tg.on{background:#4f8ff7}',
    '#'+PANEL_ID+' .pm-tg::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s}',
    '#'+PANEL_ID+' .pm-tg.on::after{transform:translateX(16px)}',
    '#'+PANEL_ID+' .pm-menu-btn{position:relative;flex-shrink:0}',
    '#'+PANEL_ID+' .pm-menu-btn>button{background:none;border:none;color:var(--color-text-weak,#888);cursor:pointer;padding:4px;border-radius:4px;font-size:14px;line-height:1}',
    '#'+PANEL_ID+' .pm-menu-btn>button:hover{background:rgba(255,255,255,.08);color:var(--color-text-base,#e0e0e0)}',
    '#'+DROPDOWN_ID+'{position:fixed;z-index:999999;background:#2a2a3e;border:1px solid rgba(255,255,255,.15);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);min-width:120px;padding:4px 0;display:none}',
    '#'+DROPDOWN_ID+'.open{display:block}',
    '#'+DROPDOWN_ID+' button{display:block;width:100%;padding:8px 12px;background:none;border:none;color:#e0e0e0;font-size:13px;text-align:left;cursor:pointer;white-space:nowrap}',
    '#'+DROPDOWN_ID+' button:hover{background:rgba(255,255,255,.08)}',
    '#'+DROPDOWN_ID+' .pm-dl{color:#f87171}',
    '#'+PANEL_ID+' .pm-ft{padding:10px 16px;border-top:1px solid var(--color-border,rgba(255,255,255,.08));display:flex;gap:8px}',
    '#'+PANEL_ID+' .pm-ft button{flex:1;padding:8px;border-radius:8px;border:none;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s}',
    '#'+PANEL_ID+' .pm-add{background:#4f8ff7;color:#fff}',
    '#'+PANEL_ID+' .pm-add:hover{background:#3b7de6}',
    '#'+PANEL_ID+' .pm-empty{text-align:center;padding:32px 16px;color:var(--color-text-weak,#888);font-size:13px}',
    '#'+PANEL_ID+' .pm-form{padding:12px 16px;display:none;flex-direction:column;gap:8px}',
    '#'+PANEL_ID+' .pm-form.open{display:flex}',
    '#'+PANEL_ID+' .pm-form input,#'+PANEL_ID+' .pm-form textarea,#'+PANEL_ID+' .pm-form select{width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--color-border,rgba(255,255,255,.12));background:var(--color-surface,rgba(255,255,255,.04));color:var(--color-text-base,#e0e0e0);font-size:13px;font-family:inherit;box-sizing:border-box}',
    '#'+PANEL_ID+' .pm-form select{appearance:auto;-webkit-appearance:auto}',
    '#'+PANEL_ID+' .pm-form select option{background:#1e1e2e;color:#e0e0e0;padding:4px 8px}',
    '#'+PANEL_ID+' .pm-form textarea{min-height:100px;resize:vertical}',
    '#'+PANEL_ID+' .pm-form .fa{display:flex;gap:8px}',
    '#'+PANEL_ID+' .pm-form .fa button{flex:1;padding:8px;border-radius:6px;border:none;font-size:13px;cursor:pointer}',
    '#'+PANEL_ID+' .pm-form .sv{background:#4f8ff7;color:#fff}',
    '#'+PANEL_ID+' .pm-form .cn{background:rgba(255,255,255,.08);color:inherit}',
    '#'+PANEL_ID+' .pm-form .pm-ft-title{font-size:12px;font-weight:600;color:var(--color-text-weak,#888);margin-bottom:4px}',
    '#'+PANEL_ID+' .pm-bk{position:fixed;inset:0;z-index:-1}',
    '#'+PANEL_ID+' .pm-resize{position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;z-index:10}',
    '#'+PANEL_ID+' .pm-resize::after{content:"";position:absolute;bottom:3px;right:3px;width:8px;height:8px;border-right:2px solid rgba(255,255,255,.25);border-bottom:2px solid rgba(255,255,255,.25)}'
  ].join('\n');

  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

  function injectStyles(){
    if(document.getElementById('pm-styles'))return;
    var s=document.createElement('style');
    s.id='pm-styles';
    s.textContent=CSS;
    document.head.appendChild(s);
  }

  function hideDropdown(){
    var d=document.getElementById(DROPDOWN_ID);
    if(d)d.classList.remove('open');
  }

  function showDropdown(anchor, file, name){
    hideDropdown();
    var d=document.getElementById(DROPDOWN_ID);
    if(!d){
      d=document.createElement('div');
      d.id=DROPDOWN_ID;
      d.addEventListener('click', handleDropdownClick);
      document.body.appendChild(d);
    }
    d.setAttribute('data-file', file);
    d.setAttribute('data-name', name);
    d.innerHTML=[
      '<button data-action="copy">Copy</button>',
      '<button data-action="edit">Edit</button>',
      '<button data-action="delete" class="pm-dl">Delete</button>'
    ].join('');
    var r=anchor.getBoundingClientRect();
    d.style.top=(r.bottom+4)+'px';
    d.style.right=(window.innerWidth-r.right)+'px';
    d.classList.add('open');
  }

  async function handleDropdownClick(e){
    var btn=e.target.closest('button');
    if(!btn)return;
    var d=document.getElementById(DROPDOWN_ID);
    var a=getApi();
    if(!a)return;
    var fp=d.getAttribute('data-file');
    var nm=d.getAttribute('data-name');
    var action=btn.getAttribute('data-action');
    hideDropdown();
    var p=document.getElementById(PANEL_ID);
    if(action==='copy'){
      var prompts=await a.listPrompts();
      var src=prompts.find(function(x){return x.file===fp});
      if(src&&p){
        p.querySelector('#pm-add-form').classList.add('open');
        p.querySelector('[data-f="name"]').value=src.name+'_copy';
        p.querySelector('[data-f="scope"]').value=src.scope;
        p.querySelector('[data-f="desc"]').value=src.description;
        p.querySelector('[data-f="body"]').value=src.body;
        p.querySelector('[data-f="name"]').focus();
      }
    }else if(action==='edit'){
      var prompts=await a.listPrompts();
      var src=prompts.find(function(x){return x.file===fp});
      if(src&&p){
        p.querySelector('#pm-edit-form').classList.add('open');
        p.querySelector('[data-f="e-name"]').value=src.name;
        p.querySelector('[data-f="e-scope"]').value=src.scope;
        p.querySelector('[data-f="e-desc"]').value=src.description;
        p.querySelector('[data-f="e-body"]').value=src.body;
        p.querySelector('[data-f="e-file"]').value=src.file;
        p.querySelector('[data-f="e-name"]').focus();
      }
    }else if(action==='delete'){
      if(confirm('Delete prompt "'+nm+'"?')){
        var r=await a.remove(fp);
        if(r)render();
      }
    }
  }

  function createPanel(){
    if(document.getElementById(PANEL_ID))return;
    var p=document.createElement('div');
    p.id=PANEL_ID;
    p.innerHTML=[
      '<div class="pm-bk" data-close></div>',
      '<div class="pm-hd"><h3>Prompt Manager</h3><button class="pm-x" data-close>&times;</button></div>',
      '<div class="pm-bd"></div>',
      '<div class="pm-form" id="pm-add-form">',
      '<div class="pm-ft-title">Add Prompt</div>',
      '<input type="text" placeholder="Name" data-f="name"/>',
      '<select data-f="scope"><option value="project">Project</option><option value="global">Global</option></select>',
      '<input type="text" placeholder="Description" data-f="desc"/>',
      '<textarea placeholder="Prompt content..." data-f="body"></textarea>',
      '<div class="fa"><button class="cn" data-form="cancel">Cancel</button><button class="sv" data-form="save">Save</button></div>',
      '</div>',
      '<div class="pm-form" id="pm-edit-form">',
      '<div class="pm-ft-title">Edit Prompt</div>',
      '<input type="text" placeholder="Name" data-f="e-name"/>',
      '<select data-f="e-scope"><option value="project">Project</option><option value="global">Global</option></select>',
      '<input type="text" placeholder="Description" data-f="e-desc"/>',
      '<textarea placeholder="Prompt content..." data-f="e-body"></textarea>',
      '<input type="hidden" data-f="e-file"/>',
      '<div class="fa"><button class="cn" data-form="ecancel">Cancel</button><button class="sv" data-form="esave">Save</button></div>',
      '</div>',
      '<div class="pm-ft"><button class="pm-add">+ Add Prompt</button></div>',
      '<div class="pm-resize" data-resize></div>'
    ].join('');
    document.body.appendChild(p);

    p.addEventListener('click', async function(e) {
      try {
        if (e.target.closest('[data-close]')) {
          p.classList.remove('open');
          hideDropdown();
          return;
        }

        var a = getApi();
        if (!a) { alert('API not available'); return; }

        var tg = e.target.closest('.pm-tg');
        if (tg) {
          hideDropdown();
          var r = await a.toggle(tg.getAttribute('data-file'));
          if (r) render();
          return;
        }

        var menuBtn = e.target.closest('.pm-menu-btn > button');
        if (menuBtn) {
          e.stopPropagation();
          var wrap = menuBtn.parentElement;
          var fp = wrap.getAttribute('data-file');
          var nm = wrap.getAttribute('data-name');
          showDropdown(menuBtn, fp, nm);
          return;
        }

        var dd = e.target.closest('#'+DROPDOWN_ID);
        if (dd) {
          var copyBtn = e.target.closest('[data-action="copy"]');
          if (copyBtn) {
            var fp = copyBtn.getAttribute('data-file');
            var prompts = await a.listPrompts();
            var src = prompts.find(function(x){return x.file===fp});
            if (src) {
              hideDropdown();
              p.querySelector('#pm-add-form').classList.add('open');
              p.querySelector('[data-f="name"]').value = src.name + '_copy';
              p.querySelector('[data-f="scope"]').value = src.scope;
              p.querySelector('[data-f="desc"]').value = src.description;
              p.querySelector('[data-f="body"]').value = src.body;
              p.querySelector('[data-f="name"]').focus();
            }
            return;
          }

          var editBtn = e.target.closest('[data-action="edit"]');
          if (editBtn) {
            var fp = editBtn.getAttribute('data-file');
            var prompts = await a.listPrompts();
            var src = prompts.find(function(x){return x.file===fp});
            if (src) {
              hideDropdown();
              p.querySelector('#pm-edit-form').classList.add('open');
              p.querySelector('[data-f="e-name"]').value = src.name;
              p.querySelector('[data-f="e-scope"]').value = src.scope;
              p.querySelector('[data-f="e-desc"]').value = src.description;
              p.querySelector('[data-f="e-body"]').value = src.body;
              p.querySelector('[data-f="e-file"]').value = src.file;
              p.querySelector('[data-f="e-name"]').focus();
            }
            return;
          }

          var delBtn = e.target.closest('[data-action="delete"]');
          if (delBtn) {
            var fp = delBtn.getAttribute('data-file');
            var nm = delBtn.getAttribute('data-name');
            hideDropdown();
            if (confirm('Delete prompt "' + nm + '"?')) {
              var r = await a.remove(fp);
              if (r) render();
            }
            return;
          }
          return;
        }

        hideDropdown();

        if (e.target.closest('.pm-add')) {
          p.querySelector('#pm-add-form').classList.add('open');
          p.querySelector('[data-f="name"]').focus();
          return;
        }

        if (e.target.closest('[data-form="cancel"]')) {
          p.querySelector('#pm-add-form').classList.remove('open');
          clearAddForm();
          return;
        }

        if (e.target.closest('[data-form="save"]')) {
          var nameEl = p.querySelector('[data-f="name"]');
          var name = nameEl.value.trim();
          if (!name) { nameEl.focus(); return; }
          var scope = p.querySelector('[data-f="scope"]').value;
          var desc = p.querySelector('[data-f="desc"]').value.trim();
          var body = p.querySelector('[data-f="body"]').value.trim();
          var result = await a.add(name, scope, desc || name, body);
          if (result) {
            p.querySelector('#pm-add-form').classList.remove('open');
            clearAddForm();
            render();
          } else {
            alert('Failed to save prompt');
          }
          return;
        }

        if (e.target.closest('[data-form="ecancel"]')) {
          p.querySelector('#pm-edit-form').classList.remove('open');
          clearEditForm();
          return;
        }

        if (e.target.closest('[data-form="esave"]')) {
          var nameEl = p.querySelector('[data-f="e-name"]');
          var name = nameEl.value.trim();
          if (!name) { nameEl.focus(); return; }
          var fp = p.querySelector('[data-f="e-file"]').value;
          var scope = p.querySelector('[data-f="e-scope"]').value;
          var desc = p.querySelector('[data-f="e-desc"]').value.trim();
          var body = p.querySelector('[data-f="e-body"]').value.trim();
          await a.remove(fp);
          var result = await a.add(name, scope, desc || name, body);
          if (result) {
            p.querySelector('#pm-edit-form').classList.remove('open');
            clearEditForm();
            render();
          } else {
            alert('Failed to save prompt');
          }
        }
      } catch(err) {
        console.error('[PM] error:', err);
        alert('[PM] Error: ' + err.message);
      }
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('#'+DROPDOWN_ID) && !e.target.closest('.pm-menu-btn')) hideDropdown();
    });

    var rh=p.querySelector('[data-resize]');
    if(rh){
      rh.addEventListener('mousedown',function(e){
        e.preventDefault();
        e.stopPropagation();
        var p=document.getElementById(PANEL_ID);
        var startX=e.clientX,startY=e.clientY;
        var startW=p.offsetWidth,startH=p.offsetHeight;
        function onMove(e){
          var w=Math.max(MIN_W,startW+(e.clientX-startX));
          var h=Math.max(MIN_H,startH+(e.clientY-startY));
          p.style.width=w+'px';
          p.style.height=h+'px';
        }
        function onUp(){
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          saveSize();
        }
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
    }

    restoreSize();
  }

  function saveSize(){
    var p=document.getElementById(PANEL_ID);
    if(!p)return;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({w:p.offsetWidth,h:p.offsetHeight}))}catch(e){}
  }

  function restoreSize(){
    var p=document.getElementById(PANEL_ID);
    if(!p)return;
    try{
      var d=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(d&&d.w>=MIN_W&&d.h>=MIN_H){p.style.width=d.w+'px';p.style.height=d.h+'px'}
    }catch(e){}
  }

  function clearAddForm(){
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    p.querySelector('[data-f="name"]').value = '';
    p.querySelector('[data-f="desc"]').value = '';
    p.querySelector('[data-f="body"]').value = '';
    p.querySelector('[data-f="scope"]').value = 'project';
  }

  function clearEditForm(){
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    p.querySelector('[data-f="e-name"]').value = '';
    p.querySelector('[data-f="e-desc"]').value = '';
    p.querySelector('[data-f="e-body"]').value = '';
    p.querySelector('[data-f="e-scope"]').value = 'project';
    p.querySelector('[data-f="e-file"]').value = '';
  }

  async function render(){
    try {
      var p = document.getElementById(PANEL_ID);
      if (!p) return;
      var bd = p.querySelector('.pm-bd');
      var a = getApi();
      if (!a) return;

      var prompts = await a.listPrompts();
      var g = prompts.filter(function(x){return x.scope==='global'});
      var pr = prompts.filter(function(x){return x.scope!=='global'});

      var h = '';
      function sec(title, items) {
        h += '<div class="pm-st">' + title + '</div>';
        if (!items.length) {
          h += '<div class="pm-empty">No ' + title.toLowerCase() + ' prompts</div>';
          return;
        }
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          h += '<div class="pm-it">';
          h += '<div class="pm-inf"><div class="pm-nm">' + esc(it.name) + '</div>';
          h += '<div class="pm-ds">' + esc(it.description) + '</div></div>';
          h += '<div class="pm-menu-btn" data-file="' + esc(it.file) + '" data-name="' + esc(it.name) + '">';
          h += '<button>&#x22ee;</button>';
          h += '</div>';
          h += '<button class="pm-tg' + (it.enabled ? ' on' : '') + '" data-file="' + esc(it.file) + '"></button>';
          h += '</div>';
        }
      }
      sec('Global', g);
      sec('Project', pr);
      bd.innerHTML = h;
    } catch(err) {
      console.error('[PM] render error:', err);
    }
  }

  function injectButton(){
    if (document.getElementById(BTN_ID)) return;
    var target = document.querySelector('[data-action="prompt-model"]');
    if (!target) return;
    var container = target.closest('[data-component="prompt-model-control"]') || target.parentElement;
    if (!container || !container.parentElement) return;

    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.title = 'Prompt Manager';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';

    btn.addEventListener('click', async function() {
      var p = document.getElementById(PANEL_ID);
      if (!p) return;
      hideDropdown();
      if (p.classList.contains('open')) {
        p.classList.remove('open');
        return;
      }
      restoreSize();
      p.style.visibility='hidden';
      p.classList.add('open');
      var pw=p.offsetWidth, ph=p.offsetHeight;
      p.style.left=Math.max(0,(window.innerWidth-pw)/2)+'px';
      p.style.top=Math.max(0,(window.innerHeight-ph)/2)+'px';
      p.style.visibility='';
      await render();
    });

    var toolbar = container.parentElement.parentElement;
    if (!toolbar) return;
    toolbar.appendChild(btn);
  }

  function recenterPanel(){
    var p=document.getElementById(PANEL_ID);
    if(!p||!p.classList.contains('open'))return;
    var pw=p.offsetWidth,ph=p.offsetHeight;
    try{
      var d=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(d&&d.w>=MIN_W&&d.h>=MIN_H){pw=d.w;ph=d.h;p.style.width=pw+'px';p.style.height=ph+'px'}
    }catch(e){}
    var maxW=Math.min(pw,window.innerWidth-16);
    var maxH=Math.min(ph,window.innerHeight-16);
    if(maxW<MIN_W)maxW=MIN_W;
    if(maxH<MIN_H)maxH=MIN_H;
    if(maxW!==pw)p.style.width=maxW+'px';
    if(maxH!==ph)p.style.height=maxH+'px';
    p.style.left=Math.max(0,(window.innerWidth-maxW)/2)+'px';
    p.style.top=Math.max(0,(window.innerHeight-maxH)/2)+'px';
  }

  function init(){
    injectStyles();
    createPanel();
    injectButton();
    window.addEventListener('resize',recenterPanel);
    new MutationObserver(function(){
      if (!document.getElementById(BTN_ID)) injectButton();
    }).observe(document.body, {childList: true, subtree: true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
