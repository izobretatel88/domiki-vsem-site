'use strict';
document.addEventListener('pointerdown',()=>{document.documentElement.dataset.interaction='pointer'},{capture:true});
document.addEventListener('keydown',()=>{document.documentElement.dataset.interaction='keyboard'},{capture:true});
let models=[];
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n)+' ₽';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const packageNames=['Холодный контур','Тёплый контур','С чистовой отделкой'];
const packageCopy=['Каркас, кровля, наружная отделка, окна и входная дверь. Состав уточняется по модели.','Холодный контур с утеплением и изоляцией конструкции.','Тёплый контур с внутренней отделкой и чистовым полом.'];
const state={category:'all',area:'all',catalogEdition:0,catalogView:'facade',detail:null,edition:0,gallery:0};
let quiz={model:null,area:'',season:'',place:'',method:'Telegram',name:'',contact:'',canCall:false,step:1};
let lastFocused=null;
const houseChoices=new Map();
const comparison=new Set();
let comparisonOpen=false;
let contactDrafts={};
let galleryTimer=null;
let catalogOrigin=null;
let menuNavigation=false;
// Hash routes own scrolling; native history restoration would compete with it.
if('scrollRestoration' in history)history.scrollRestoration='manual';
document.addEventListener('click',e=>{
 const link=e.target.closest('#home-page a[href^="#house-"]');
 if(!link||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 catalogOrigin={top:window.scrollY,width:window.innerWidth,hash:location.hash,trigger:link};
},{capture:true});
const quizDialog=$('#quiz-dialog');
$('#catalog-options-done').addEventListener('click',()=>{$('#catalog-options').open=false;$('#catalog-options summary').focus();});
function modelCard(m,canCompare=false){const plan=canCompare&&state.catalogView==='plan';return `<article class="model-card"><a class="model-image ${plan?'is-plan':''}" href="#house-${esc(m.id)}" aria-label="Подробнее: ${esc(m.title)}"><img src="${esc(m.images[plan?1:0])}" alt="${plan?'Планировка: ':'Фасад: '}${esc(m.title)}, из каталога компании" width="960" height="660" loading="lazy"><span class="model-type">${esc(m.category)}</span><span class="circle-arrow" aria-hidden="true">↗</span></a><div class="model-info"><h3><a href="#house-${esc(m.id)}">${esc(m.title)}</a></h3><div class="model-specs"><span>${esc(m.area)} м² общий габарит</span><span>${esc(m.size)} м</span></div></div><div class="model-price"><div><strong>${money(m.prices[state.catalogEdition])}</strong><span class="price-caption">${packageNames[state.catalogEdition]}</span></div></div>${canCompare?`<p class="model-price-context">Отделка на фото может не входить в цену.</p><details class="model-inclusions"><summary aria-label="Что входит в цену: ${esc(m.title)}">Что входит в цену</summary><div><p>${packageCopy[state.catalogEdition]}</p><p>Фундамент, доставку, монтаж и инженерные системы нужно уточнить в смете.</p></div></details>`:''}${canCompare?`<button class="compare-pick" data-compare="${esc(m.id)}" aria-pressed="${comparison.has(m.id)}" aria-label="${comparison.has(m.id)?'Убрать из сравнения: ':'Сравнить: '}${esc(m.title)}">${comparison.has(m.id)?'Добавлен в сравнение':'Добавить к сравнению'}</button>`:''}</article>`;}
const heroActions=$('.hero-buttons');
const heroActionsMedia=matchMedia('(max-width:768px)');
function placeHeroActions(){
 const focused=heroActions.contains(document.activeElement)?document.activeElement:null;
 if(heroActionsMedia.matches)$('.hero-featured').after(heroActions);else $('.hero-copy').append(heroActions);
 focused?.focus({preventScroll:true});
}
placeHeroActions();heroActionsMedia.addEventListener('change',placeHeroActions);
const heroFacade={src:$('#hero-image').getAttribute('src'),srcset:$('#hero-image').getAttribute('srcset'),sizes:$('#hero-image').getAttribute('sizes')};
let heroImageTimer=null;
function finishHeroImageLoad(error=false){
 clearTimeout(heroImageTimer);
 const visual=$('#hero-image').closest('.hero-visual');
 visual.classList.remove('is-image-pending');visual.classList.toggle('is-image-error',error);
 $('#hero-image-feedback').hidden=!error;
 $('#hero-image-status').textContent=error?'Не удалось загрузить '+(visual.classList.contains('is-plan')?'планировку.':'изображение дома.'):'';
 $('#hero-image-retry').hidden=!error;
 $('#hero-plan-full').hidden=error||!visual.classList.contains('is-plan');
}
function startHeroImageLoad(){
 clearTimeout(heroImageTimer);
 const visual=$('#hero-image').closest('.hero-visual');
 visual.classList.remove('is-image-error');visual.classList.add('is-image-pending');
 $('#hero-image-feedback').hidden=true;$('#hero-image-retry').hidden=true;$('#hero-plan-full').hidden=true;
 heroImageTimer=setTimeout(()=>{$('#hero-image-status').textContent='Загружаем изображение…';$('#hero-image-feedback').hidden=false;},250);
}
$('#hero-image').addEventListener('load',()=>finishHeroImageLoad());
$('#hero-image').addEventListener('error',()=>finishHeroImageLoad(true));
$('#hero-image-retry').addEventListener('click',()=>{
 const img=$('#hero-image'),url=new URL(img.src);url.searchParams.set('retry',Date.now());
 $('[data-hero-view][aria-pressed="true"]').focus({preventScroll:true});
 startHeroImageLoad();img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=url.href;
});
if($('#hero-image').complete)finishHeroImageLoad(!$('#hero-image').naturalWidth);else startHeroImageLoad();
$$('[data-hero-view]').forEach(button=>button.addEventListener('click',()=>{
 const plan=button.dataset.heroView==='plan';const img=$('#hero-image');
 startHeroImageLoad();
 img.srcset=plan?'':heroFacade.srcset;img.sizes=plan?'':heroFacade.sizes;
 img.width=plan?1537:1600;img.height=1200;
 img.src=plan?'assets/house-1-2.webp':heroFacade.src;
 img.alt=plan?'Планировка дачного домика 8×6 из каталога компании':'Дачный домик 8×6: визуализация из каталога компании';
 img.closest('.hero-visual').classList.toggle('is-plan',plan);
 $('#hero-plan-full').hidden=!plan||!img.complete||!img.naturalWidth;
 $('#hero-image-caption').textContent=plan?'Планировка из каталога':'Визуализация из каталога';
 $('#hero-price-scope').textContent=plan?'Мебель и сантехника на плане — условные обозначения. Состав и работы на участке — по смете.':'Состав на изображении нужно сверить со сметой.';
 $$('[data-hero-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 if(img.complete)finishHeroImageLoad(!img.naturalWidth);
}));
const heroEdition=()=>Number($('input[name="hero-edition"]:checked').value);
function renderHeroOffer(){
 const model=models.find(m=>m.id==='1');if(!model)return;
 $$('[data-hero-price]').forEach(el=>el.textContent=money(model.prices[el.dataset.heroPrice]));
 $('#hero-package-copy').textContent=packageCopy[heroEdition()];
}
$('#hero-packages').addEventListener('change',renderHeroOffer);
$('#hero-catalog-open').addEventListener('click',()=>applyCatalogEdition(heroEdition()));
$('#hero-model-open').addEventListener('click',()=>houseChoices.set('1',{edition:heroEdition(),gallery:1}));
function applyCatalogEdition(index){state.catalogEdition=index;houseChoices.clear();$('#catalog-edition').value=String(index);$('#catalog-edition-note').textContent=packageCopy[index];renderCatalog();}
$('#catalog-edition').addEventListener('change',e=>applyCatalogEdition(Number(e.target.value)));
function renderCatalog(){if(!models.length)return;$('#catalog-options-summary').textContent=({all:'Любая площадь',small:'До 40 м²',medium:'40–60 м²',large:'От 60 м²'})[state.area]+' · '+packageNames[state.catalogEdition];const list=models.filter(m=>(state.category==='all'||m.categoryKey===state.category)&&(state.area==='all'||(state.area==='small'&&m.area<40)||(state.area==='medium'&&m.area>=40&&m.area<60)||(state.area==='large'&&m.area>=60)));$('#model-grid').innerHTML=list.map(m=>modelCard(m,true)).join('');$('#catalog-count').textContent=list.length+' '+(['модель','модели','моделей'][list.length===1?0:list.length>1&&list.length<5?1:2])+' в подборке';$('#catalog-empty').hidden=!!list.length;updateComparison();}

function updateComparison(){
 const chosen=models.filter(m=>comparison.has(m.id));
 if(chosen.length!==2)comparisonOpen=false;
 const showTray=!!chosen.length&&!comparisonOpen&&!$('#home-page').hidden;
 $('#compare-tray').hidden=!showTray;
 document.documentElement.classList.toggle('has-comparison-tray',showTray);
 $('#compare-count').textContent=chosen.length===1?'Выбран один дом. Добавьте второй для сравнения.':'Выбраны два дома. Сравните планировки и стоимость.';
 $('#compare-open').disabled=chosen.length!==2;
 $$('[data-compare]').forEach(b=>{const selected=comparison.has(b.dataset.compare);b.setAttribute('aria-pressed',selected);b.disabled=!selected&&chosen.length===2;b.textContent=selected?'Добавлен в сравнение':'Добавить к сравнению';b.setAttribute('aria-label',(selected?'Убрать из сравнения: ':'Сравнить: ')+models.find(m=>m.id===b.dataset.compare).title);});
 if(chosen.length!==2)comparisonOpen=false;
 $('#house-comparison').hidden=!comparisonOpen;
 if(!comparisonOpen)return;
 const row=(label,values)=>`<tr><th scope="row">${label}</th>${values.map(v=>`<td>${v}</td>`).join('')}</tr>`;
 $('#comparison-content').innerHTML=`<table class="house-comparison-table"><caption>Параметры и цены двух выбранных домов</caption><thead><tr><td></td>${chosen.map(m=>`<th scope="col"><a href="#house-${m.id}">${esc(m.title)} ↗</a><button class="text-button" data-remove-compare="${m.id}">Убрать</button></th>`).join('')}</tr></thead><tbody>${row('Внешний вид',chosen.map(m=>`<img src="${esc(m.images[0])}" alt="${esc(m.title)}" width="600" height="400" loading="lazy">`))}${row('Общий габарит',chosen.map(m=>esc(m.size)+' м'))}${row('Площадь по габаритам',chosen.map(m=>esc(m.area)+' м²'))}${row('Планировка',chosen.map(m=>`<a class="comparison-plan" href="${esc(m.images[1])}" target="_blank" rel="noopener" aria-label="Планировка ${esc(m.title)} в полном размере"><img src="${esc(m.images[1])}" alt="Планировка ${esc(m.title)}" width="600" height="450" loading="lazy"><span>Увеличить ↗</span></a>`))}${packageNames.map((name,i)=>row(name,chosen.map(m=>`<strong>${money(m.prices[i])}</strong>`))).join('')}</tbody></table>`;
}
document.addEventListener('click',e=>{const pick=e.target.closest('[data-compare],[data-remove-compare]');if(!pick)return;const id=pick.dataset.compare||pick.dataset.removeCompare;if(comparison.has(id))comparison.delete(id);else if(comparison.size<2)comparison.add(id);const removedFromTable=!!pick.dataset.removeCompare;updateComparison();if(removedFromTable)$('#compare-count').focus();});
$('#compare-open').addEventListener('click',()=>{comparisonOpen=true;updateComparison();$('#house-comparison').scrollIntoView({behavior:'instant'});$('#comparison-title').focus({preventScroll:true});});
$('#compare-clear').addEventListener('click',()=>{comparison.clear();comparisonOpen=false;updateComparison();$('#catalog-title').setAttribute('tabindex','-1');$('#catalog-title').focus();});
$$('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;$$('[data-category]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active)});renderCatalog()}));
$('#area-filter').addEventListener('change',e=>{state.area=e.target.value;renderCatalog()});
$$('[data-shop-category]').forEach(t=>t.addEventListener('click',()=>$(`.filter[data-category="${t.dataset.shopCategory}"]`)?.click()));
$('#reset-filters').addEventListener('click',()=>{state.category='all';state.area='all';$('#area-filter').value='all';$$('[data-category]').forEach(b=>{const active=b.dataset.category==='all';b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});renderCatalog()});
function specRows(m){return m.description.split(/<br\s*\/?\s*>/i).map(x=>x.replace(/<[^>]*>/g,'')).filter(Boolean).map(s=>{const i=s.indexOf('-');return {name:s.slice(0,i),value:s.slice(i+1)}}).filter(s=>s.name&&!s.name.includes('Высота')).slice(0,3);}

function costBreakdown(m){return `<section class="cost-breakdown" id="cost-breakdown" aria-labelledby="cost-heading"><div class="cost-intro"><h2 id="cost-heading" tabindex="-1">Сколько будет стоить<br>дом на вашем участке?</h2><p>Цена комплектации — отправная точка. Чтобы получить итог, нужно проверить состав работ и условия участка.</p><div class="cost-base"><span id="cost-package">${packageNames[state.edition]}</span><strong id="cost-price">${money(m.prices[state.edition])}</strong><small>Цена из каталога на 02.11.2026, требует подтверждения</small></div><button class="button" data-detail-quiz>Собрать запрос на расчёт ↗</button></div><div class="cost-lines"><h3>Что сверить в смете</h3>${[
 ['Фундамент','Проверить состав','Какая конструкция предусмотрена для этой модели, входит ли она в цену и потребуется ли адаптация к грунту и перепаду высот на участке.'],
 ['Доставка и разгрузка','Нужны условия участка','Укажите населённый пункт. Подготовьте фото подъезда и ворот; отметьте провода, деревья, узкие повороты и состояние дороги. Способ доставки согласуется по проекту.'],
 ['Монтаж','Проверить состав работ','Уточните, включена ли сборка на участке, какие работы выполняет бригада и что нужно подготовить до её приезда.'],
 ['Инженерия и изменения','По вашим пожеланиям','Отопление, электрика, вода и канализация, изменения планировки и отделки проверяются отдельно. Название «чистовая отделка» не определяет их состав.']
 ].map(([title,status,copy])=>`<details><summary><span>${title}<small>${status}</small></span></summary><p>${copy}</p></details>`).join('')}<div class="cost-result"><span>Итог на участке</span><strong>После уточнения состава</strong><p>Неизвестные расходы не считаем нулевыми. В итоговой смете каждая позиция должна иметь цену или пометку «включено».</p></div></div></section>`;}
function renderDetail(id){const m=models.find(x=>x.id===id);state.detail=m;const remembered=houseChoices.get(id);state.edition=remembered?.edition??state.catalogEdition;state.gallery=remembered?.gallery??(state.catalogView==='plan'?1:0);if(!m){$('#detail-page').innerHTML='<div class="container detail-missing"><h1>Дом не найден</h1><p>Выберите модель в каталоге.</p><a class="button" href="#catalog">Вернуться к домам</a></div>';return;}
$('#detail-page').innerHTML=`<section class="container detail-top detail-content"><nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="#">Главная</a><span>/</span><a href="#catalog">← К подборке</a><span>/</span><span>${esc(m.title)}</span></nav><div class="detail-heading"><div><h1>${esc(m.title)}</h1></div><p>Выберите готовность дома.<br>Состав и стоимость меняются вместе с комплектацией.</p></div><div class="mobile-price-summary"><div><span id="mobile-package">${packageNames[state.edition]}</span><strong id="mobile-price">${money(m.prices[state.edition])}</strong></div><button class="text-button" id="jump-packages">Выбрать комплектацию ↓</button><p>Каталог на 02.11.2026. Состав на фото и итоговую смету нужно подтвердить.</p></div><div class="detail-layout"><div><div class="gallery-views" role="group" aria-label="Вид дома"><button data-view="facade" aria-pressed="true">Фасад</button><button data-view="plan" aria-pressed="false">Планировка</button><span id="gallery-position" aria-live="polite">1 / ${m.images.length}</span></div><div class="gallery-main"><img id="gallery-image" src="${m.images[0]}" alt="${esc(m.title)}, вид 1" width="1200" height="850"><button class="gallery-arrow gallery-prev" aria-label="Предыдущее изображение">‹</button><button class="gallery-arrow gallery-next" aria-label="Следующее изображение">›</button><span class="image-caption">Изображения из каталога компании</span></div><a class="text-button plan-full" href="${esc(m.images[1])}" target="_blank" rel="noopener" id="plan-full" hidden>Открыть план в полном размере ↗</a><div class="gallery-feedback"><span id="gallery-status" role="status"></span><button class="text-button" id="gallery-retry" hidden>Повторить загрузку</button></div><div class="gallery-thumbs">${m.images.map((src,i)=>`<button class="gallery-thumb ${i===0?'active':''}" data-gallery="${i}" aria-label="${i===1?'Показать планировку':'Показать вид дома '+(i+1)}" aria-pressed="${i===0}"><img src="${src}" alt="" width="200" height="140"></button>`).join('')}</div><p class="photo-disclosure">Изображения показывают внешний вид и варианты исполнения. Отделка на фото может не входить в выбранную цену: ориентируйтесь на состав комплектации и смету.</p><dl class="detail-specs">${specRows(m).map(s=>`<div><dt>${esc(s.name)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl><div class="detail-text"><h3>Дом начинается с ваших задач</h3><p>Планируете приезжать на выходные или проводить за городом весь сезон? Расскажите, как хотите использовать дом. Уточним размер, расположение входа, окон и террасы, а затем состав работ для вашего проекта.</p></div></div><aside class="detail-packages" aria-labelledby="package-heading"><h2 id="package-heading" tabindex="-1">Выберите комплектацию</h2><p>Цена комплектации из каталога. Итог на участке требует расчёта.</p><div role="group" aria-label="Комплектация дома">${m.prices.slice(0,3).map((p,i)=>`<button class="package-option ${i===state.edition?'selected':''}" data-package="${i}" aria-pressed="${i===state.edition}"><span class="radio-mark" aria-hidden="true"></span><span><span class="package-option-title"><span>${packageNames[i]}</span><span class="package-option-price">${money(p)}</span></span><span class="package-option-description">${packageCopy[i]}</span>${i?`<span class="package-option-delta">+ ${money(p-m.prices[i-1])} к ${i===1?'холодному':'тёплому'} контуру</span>`:''}</span></button>`).join('')}</div><div class="detail-total"><p class="photo-price-note">На фото показан внешний вид дома. Отделка на изображении может не входить в эту комплектацию.</p><span id="selected-package">${packageNames[state.edition]}</span><strong id="detail-price" aria-live="polite" aria-atomic="true">${money(m.prices[state.edition])}</strong><button class="button" data-detail-quiz>Получить смету <span aria-hidden="true">↗</span></button><p>Снимок цены из каталога на 02.11.2026. Требует подтверждения. Точный состав, доставка и монтаж согласуются по вашему проекту.</p></div><button class="text-button" id="show-cost">Что ещё влияет на стоимость? ↓</button></aside></div>${costBreakdown(m)}</section><section class="section container related-section"><h2>Посмотрите и эти дома</h2><div class="model-grid">${models.filter(x=>x.id!==id).slice(0,3).map(m=>modelCard(m)).join('')}</div></section>`;
$('#jump-packages').addEventListener('click',()=>{$('.detail-packages').scrollIntoView({behavior:document.documentElement.dataset.interaction==='keyboard'||matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});$('#package-heading').focus({preventScroll:true});});
$('#show-cost').addEventListener('click',()=>{$('#cost-breakdown').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});$('#cost-heading').focus({preventScroll:true})});
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setGallery(b.dataset.view==='plan'?1:0)));
$$('[data-gallery]').forEach(b=>b.addEventListener('click',()=>setGallery(Number(b.dataset.gallery))));$('.gallery-prev').addEventListener('click',()=>setGallery(state.gallery-1));$('.gallery-next').addEventListener('click',()=>setGallery(state.gallery+1));$$('[data-package]').forEach(b=>b.addEventListener('click',()=>{state.edition=Number(b.dataset.package);houseChoices.set(m.id,{edition:state.edition,gallery:state.gallery});$$('[data-package]').forEach(x=>{const active=x===b;x.classList.toggle('selected',active);x.setAttribute('aria-pressed',active)});$('#selected-package').textContent=packageNames[state.edition];$('#detail-price').textContent=money(m.prices[state.edition]);$('#mobile-price').textContent=money(m.prices[state.edition]);$('#mobile-package').textContent=packageNames[state.edition];$('#cost-package').textContent=packageNames[state.edition];$('#cost-price').textContent=money(m.prices[state.edition]);}));$$('[data-detail-quiz]').forEach(b=>b.addEventListener('click',()=>openQuiz(m.id,true)));
setupGallery();setGallery(state.gallery);
}
function startGalleryLoad(){clearTimeout(galleryTimer);$('.gallery-main').setAttribute('aria-busy','true');$('#gallery-status').textContent='';$('#gallery-retry').hidden=true;galleryTimer=setTimeout(()=>{if($('#gallery-status'))$('#gallery-status').textContent='Загружаем изображение…';},250);}
function finishGalleryLoad(){clearTimeout(galleryTimer);$('.gallery-main')?.setAttribute('aria-busy','false');if($('#gallery-status'))$('#gallery-status').textContent='';}
function setupGallery(){const img=$('#gallery-image');img.decoding='async';img.addEventListener('load',()=>{if(img===$('#gallery-image'))finishGalleryLoad()});img.addEventListener('error',()=>{if(img!==$('#gallery-image'))return;finishGalleryLoad();$('#gallery-status').textContent='Изображение не загрузилось. Повторите загрузку или выберите другой вид.';$('#gallery-retry').hidden=false;});$('#gallery-retry').addEventListener('click',()=>{startGalleryLoad();img.src=state.detail.images[state.gallery]});}
function setGallery(i){const m=state.detail;state.gallery=(i+m.images.length)%m.images.length;houseChoices.set(m.id,{edition:state.edition,gallery:state.gallery});$('.gallery-main').classList.toggle('is-plan',state.gallery===1);$('#plan-full').hidden=state.gallery!==1;startGalleryLoad();$('#gallery-image').src=m.images[state.gallery];if($('#gallery-image').complete&&$('#gallery-image').naturalWidth)finishGalleryLoad();$('#gallery-image').alt=m.title+(state.gallery===1?', планировка':', вид '+(state.gallery+1));$('#gallery-position').textContent=(state.gallery+1)+' / '+m.images.length;$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===(state.gallery===1?'plan':'facade')));$$('[data-gallery]').forEach(b=>{const active=Number(b.dataset.gallery)===state.gallery;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});}
function route(){
 clearTimeout(galleryTimer);
 const hash=location.hash;
 const match=hash.match(/^#house-(\d+)$/);
 const detail=!!match;
 if(detail&&!models.length){$('#home-page').hidden=false;$('#detail-page').hidden=true;$('#catalog').scrollIntoView({block:'start'});$('#catalog-load-title')?.focus({preventScroll:true});return;}
 const leavingDetail=!$('#detail-page').hidden;
 const fromMenu=menuNavigation;menuNavigation=false;
 $('#home-page').hidden=detail;$('#detail-page').hidden=!detail;
 updateComparison();
 if(detail){
  renderDetail(match[1]);window.scrollTo({top:0,behavior:'instant'});
  document.title=(state.detail?.title||'Дом')+' — Домики-Всем';
  const heading=$('h1',$('#detail-page'));
  if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 }else{
  document.title='Домики-Всем — дома для жизни за городом';
  const returning=leavingDetail&&catalogOrigin?.trigger.isConnected&&(hash==='#catalog'||hash===catalogOrigin.hash);
  const target=document.getElementById(hash.slice(1));
  requestAnimationFrame(()=>{
   if(returning){
    const trigger=catalogOrigin.trigger;
    if(catalogOrigin.width===window.innerWidth)window.scrollTo({top:catalogOrigin.top,behavior:'instant'});
    else (trigger.closest('.model-card')||trigger).scrollIntoView({behavior:'instant',block:'start'});
    if(trigger.isConnected)trigger.focus({preventScroll:true});
   }else{
    if(target)target.scrollIntoView({behavior:'instant'});
    else window.scrollTo({top:0,behavior:'instant'});
    if(leavingDetail||fromMenu){
     const heading=target?.querySelector('h1,h2')||$('#hero-title');
     heading.tabIndex=-1;heading.focus({preventScroll:true});
    }
   }
  });
 }
 setMobileMenu(false);
}
window.addEventListener('hashchange',route);
const icons={close:'<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>',menu:'<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'};
function setMobileMenu(open,restoreFocus=false){
 const button=$('.menu-button');$('.mobile-nav').hidden=!open;
 button.setAttribute('aria-expanded',String(open));
 button.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
 button.innerHTML=open?icons.close:icons.menu;
 if(restoreFocus)button.focus({preventScroll:true});
}
$('.menu-button').addEventListener('click',()=>setMobileMenu($('.mobile-nav').hidden));
$('.mobile-nav').addEventListener('click',e=>{
 const link=e.target.closest('a');
 if(!link||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 e.preventDefault();menuNavigation=true;
 if(location.hash===link.hash)route();else location.hash=link.hash;
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('.mobile-nav').hidden){e.preventDefault();setMobileMenu(false,true);}
});
document.addEventListener('pointerdown',e=>{
 if(!$('.mobile-nav').hidden&&!$('.header').contains(e.target))setMobileMenu(false);
});
document.addEventListener('focusin',e=>{
 if(!$('.mobile-nav').hidden&&!$('.header').contains(e.target))setMobileMenu(false);
});
matchMedia('(min-width:769px)').addEventListener('change',e=>{
 const active=document.activeElement;
 if(!e.matches){if(active===$('.header-actions [data-quiz]'))$('.menu-button').focus({preventScroll:true});return;}
 if(active===$('.menu-button')||$('.mobile-nav').contains(active))$('.desktop-nav a')?.focus({preventScroll:true});
 setMobileMenu(false);
});
$('.theme-toggle').addEventListener('click',()=>{const current=document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=current==='dark'?'light':'dark';});
const productionLabels={drying:'Сушильная камера',treatment:'Ванна для защитной обработки древесины',painting:'Покрасочный цех',warehouse:'Склад материалов под навесом'};
const productionQuestions={
 drying:['Из чего соберут ваш дом?','Уточните, из какого пиломатериала будет собран дом и как контролируют его влажность. Попросите зафиксировать материал в спецификации.'],
 treatment:['Как обработают древесину?','Попросите указать название защитного состава, способ обработки и перечень обрабатываемых элементов в спецификации вашего дома.'],
 painting:['Какая отделка войдёт в цену?','Уточните, какие поверхности будут окрашены, каким составом и где выполнят работу. Согласуйте цвет и состав отделки до заказа.'],
 warehouse:['Как материалы дождутся сборки?','Обсудите условия хранения и порядок защиты материалов на время доставки и сборки. Фотография показывает склад из архива компании.']
};
$$('[data-production]').forEach(b=>b.addEventListener('click',()=>{$$('[data-production]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active)});$('#production-image').src='assets/'+b.dataset.production+'.webp';$('#production-image').alt=productionLabels[b.dataset.production]+' на производстве Домики-Всем';$('#production-full').href='assets/'+b.dataset.production+'.webp';$('#production-full').setAttribute('aria-label','Рассмотреть фото: '+b.querySelector('.production-tab-title').textContent.replace('↗','').trim()+' (новая вкладка)');const question=productionQuestions[b.dataset.production];$('#production-question-title').textContent=question[0];$('#production-question-copy').textContent=question[1];}));
$$('[data-production-preview]').forEach(link=>link.addEventListener('click',e=>{
 if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 $('[data-production="'+link.dataset.productionPreview+'"]').click();
 menuNavigation=true;
 if(location.hash==='#production'){e.preventDefault();route();}
}));
function openQuiz(id=null,fromDetail=false,purpose=null,edition=null){contactDrafts={};lastFocused=document.activeElement;quiz={purpose,model:id,edition:fromDetail?state.edition:edition,area:id?(models.find(m=>m.id===id).area<40?'До 40 м²':models.find(m=>m.id===id).area<60?'40–60 м²':'60–80 м²'):'',season:'',place:'',method:'Telegram',name:'',contact:'',canCall:false,step:purpose?3:1};quizDialog.showModal();document.body.style.overflow='hidden';renderQuiz();}
function closeQuiz(){quizDialog.close();}
$('#mobile-menu-quiz').addEventListener('click',()=>{setMobileMenu(false,true);openQuiz();});
$$('[data-quiz]').forEach(b=>b.addEventListener('click',()=>openQuiz(null,false,null,b.closest('.hero')?heroEdition():null)));$('.close-dialog').addEventListener('click',closeQuiz);quizDialog.addEventListener('close',()=>{document.body.style.overflow='';lastFocused?.focus()});
quizDialog.addEventListener('click',e=>{if(e.target===quizDialog){const r=quizDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeQuiz();}});
function quizTop(title,description){if(quiz.purpose)return `<p class="quiz-step-label">Посещение производства</p><h2 class="quiz-title" id="quiz-title" tabindex="-1">${title}</h2><p class="quiz-description">${description}</p>`;return `<div class="quiz-progress" aria-label="Шаг ${quiz.step} из 3">${[1,2,3].map(i=>`<span class="${i<=quiz.step?'done':''}"></span>`).join('')}</div><p class="quiz-step-label">${['','Ваши пожелания','Подборка и цены','Способ связи'][quiz.step]} / ${quiz.step} из 3</p><h2 class="quiz-title" id="quiz-title" tabindex="-1">${title}</h2><p class="quiz-description">${description}</p>`;}
function quizActions(next=quiz.step===1?'Показать дома и цены':'Продолжить'){return `<div class="quiz-actions"><button class="text-button" id="quiz-back">${quiz.step>1?'← Назад':'Закрыть'}</button><button class="button" id="quiz-next">${next} <span aria-hidden="true">→</span></button></div><p class="quiz-demo">Демонстрация: заявки не отправляются компании. Используйте тестовые контакты.</p>`;}
function quizMatches(){return models.filter(m=>quiz.area==='Пока не знаю'||(quiz.area==='До 40 м²'&&m.area<40)||(quiz.area==='40–60 м²'&&m.area>=40&&m.area<60)||(quiz.area==='60–80 м²'&&m.area>=60&&m.area<=80));}
function renderQuiz(){if(quiz.step===2&&quiz.model&&!quizMatches().some(m=>m.id===quiz.model))quiz.model=null;const m=models.find(x=>x.id===quiz.model);let html='';
if(quiz.step===1){html=quizTop('Как вы хотите жить за городом?',quiz.edition!=null&&!m?'Сравним дома: '+packageNames[quiz.edition]+'. Комплектацию можно изменить. Контакты пока не нужны.':'Покажем варианты по площади и их цены. Контакты пока не нужны.')+(m?`<div class="contact-summary"><strong>${esc(m.title)}</strong><span>${quiz.edition==null?'Комплектацию подберём':packageNames[quiz.edition]}</span></div>`:'')+`<span class="field-label" id="area-label">Какая площадь нужна?</span><div class="choice-grid" role="group" aria-labelledby="area-label">${['До 40 м²','40–60 м²','60–80 м²','Пока не знаю'].map(v=>`<button class="choice ${quiz.area===v?'selected':''}" data-area="${v}" aria-pressed="${quiz.area===v}">${v}</button>`).join('')}</div><span class="field-label" id="season-label">Когда будете использовать дом?</span><div class="choice-grid" role="group" aria-labelledby="season-label">${['Летом','С весны до осени','Буду приезжать зимой','Для постоянного проживания'].map(v=>`<button class="choice ${quiz.season===v?'selected':''}" data-season="${v}" aria-pressed="${quiz.season===v}">${v}</button>`).join('')}</div><details class="delivery-checklist delivery-options" ${quiz.place?'open':''}><summary>Указать район <small>(необязательно)</small></summary><label class="form-field delivery-field"><span>Населённый пункт или район</span><input id="delivery-place" type="text" autocomplete="off" maxlength="120" value="${esc(quiz.place)}" placeholder="Например, Истринский район" aria-describedby="delivery-help"></label><p class="field-help" id="delivery-help">Точный адрес можно обсудить позже. Место установки поможет уточнить доставку.</p><p>Для расчёта доставки могут понадобиться:</p><ul><li>Фотографии дороги, поворотов и ворот.</li><li>Информация о проводах, деревьях и других препятствиях на подъезде.</li></ul><p>Способ доставки и стоимость уточняются по выбранной модели и условиям участка.</p></details><p class="form-error" id="quiz-error" role="alert"></p>`+quizActions();}
if(quiz.step===2){const list=quizMatches();html=quizTop('Вот что можно сравнить.','Модели отобраны по общим габаритам. Посмотрите цены и выберите вариант — контакты пока не нужны.')+`<label class="field-label" for="preview-edition">Комплектация для сравнения</label><select class="preview-edition" id="preview-edition">${packageNames.map((name,i)=>`<option value="${i}" ${i===(quiz.edition??state.catalogEdition)?'selected':''}>${name}</option>`).join('')}</select><div class="preview-houses">${list.map(x=>`<button class="preview-house ${quiz.model===x.id?'selected':''}" data-preview-model="${x.id}" aria-pressed="${quiz.model===x.id}"><img src="${esc(x.images[0])}" alt="" width="200" height="140"><span><strong>${esc(x.title)}</strong><small>${esc(x.area)} м² · ${esc(x.size)} м</small><b>${money(x.prices[quiz.edition??state.catalogEdition])}</b><small>${packageNames[quiz.edition??state.catalogEdition]}</small></span></button>`).join('')}</div><p class="preview-note">${quiz.place?'Место установки: '+esc(quiz.place)+'. ':''}${quiz.season==='Летом'?'Режим использования: лето.':`Режим использования: ${esc(quiz.season.toLowerCase())}. Утепление, отопление и инженерные решения нужно проверить отдельно — подбор по площади не подтверждает пригодность дома для зимы или постоянного проживания.`}</p><p class="preview-note">Цены из каталога на 02.11.2026. Состав на изображении, фундамент, доставка и монтаж требуют проверки. Это не итоговая смета.</p><p class="form-error" id="preview-error" role="alert"></p><div class="quiz-actions"><button class="text-button" id="quiz-back">← Изменить пожелания</button><button class="button" id="quiz-next">Выбрать способ связи →</button></div><button class="text-button" id="preview-open">Открыть выбранный дом без заявки ↗</button>`;}
if(quiz.step===3){html=quizTop(quiz.purpose?'Как обсудим посещение производства?':'Куда вам удобнее получить смету?',quiz.purpose?'Оставьте предпочтительный способ связи для обсуждения формата посещения.':'Вы выбираете канал связи. Разрешение на звонок можно оставить отдельно.')+(m?`<div class="contact-summary"><strong>${esc(m.title)}</strong><span>${quiz.edition==null?'Комплектацию подберём':packageNames[quiz.edition]}</span></div>`:'')+`<div class="contact-tabs" role="group" aria-label="Канал связи">${['Telegram','WhatsApp','Max','Телефон'].map(v=>`<button class="filter ${quiz.method===v?'active':''}" data-method="${v}" aria-pressed="${quiz.method===v}">${v}</button>`).join('')}</div><form id="contact-form" novalidate><label class="form-field"><span>Как к вам обращаться <small>(необязательно)</small></span><input id="contact-name" autocomplete="off" maxlength="60" value="${esc(quiz.name)}" placeholder="Ваше имя"></label><label class="form-field"><span>${quiz.method==='Telegram'?'Username в Telegram (обязательно)':'Номер телефона (обязательно)'}</span><input id="contact-value" autocomplete="off" ${quiz.method==='Telegram'?'type="text"':'type="tel" inputmode="tel"'} maxlength="50" value="${esc(quiz.contact)}" placeholder="${quiz.method==='Telegram'?'@username':'+7 (___) ___-__-__'}" aria-describedby="contact-error" required></label>${quiz.method!=='Telegram'&&quiz.method!=='Телефон'?`<label class="check-label"><input type="checkbox" id="can-call" ${quiz.canCall?'checked':''}><span>Можно позвонить мне для уточнения проекта</span></label>`:quiz.method==='Телефон'?'<p class="phone-explanation">Вы выбрали звонок. По этому номеру можно связаться для обсуждения сметы.</p>':''}<p class="form-error" id="contact-error" role="alert"></p><div class="quiz-actions"><button class="text-button" type="button" id="quiz-back">← Назад</button><button class="button" type="submit">Посмотреть заявку <span aria-hidden="true">↗</span></button></div><p class="quiz-demo">Это демонстрация, а не отправка заявки. Контакты не передаются и не сохраняются. Для просмотра можно ввести @test_user.</p></form>`;}
$('#quiz-content').dataset.step=String(quiz.step);$('#quiz-content').innerHTML=html;quizDialog.scrollTop=0;$('#quiz-title')?.focus({preventScroll:true});
$('#quiz-back')?.addEventListener('click',()=>{saveContact();if(quiz.step<=1||quiz.purpose)closeQuiz();else{quiz.step--;renderQuiz();}});
$('#quiz-next')?.addEventListener('click',()=>{saveContact();if(quiz.step===1&&(!quiz.area||!quiz.season)){$('#quiz-error').textContent='Выберите площадь и время использования дома.';return;}if(quiz.step===2&&!quiz.model){$('#preview-error').textContent='Выберите дом из подборки, чтобы продолжить.';return;}if(quiz.step===2)quiz.edition??=state.catalogEdition;quiz.step++;renderQuiz();});
$('#preview-edition')?.addEventListener('change',e=>{quiz.edition=Number(e.target.value);renderQuiz();});
$$('[data-preview-model]').forEach(b=>b.addEventListener('click',()=>{quiz.model=b.dataset.previewModel;quiz.edition??=state.catalogEdition;$$('[data-preview-model]').forEach(x=>{const active=x===b;x.classList.toggle('selected',active);x.setAttribute('aria-pressed',active)});$('#preview-error').textContent='';}));
$('#preview-open')?.addEventListener('click',()=>{if(!quiz.model){$('#preview-error').textContent='Сначала выберите дом из подборки.';return;}state.catalogEdition=quiz.edition??state.catalogEdition;$('#catalog-edition').value=String(state.catalogEdition);$('#catalog-edition-note').textContent=packageCopy[state.catalogEdition];renderCatalog();closeQuiz();location.hash='#house-'+quiz.model;route();});
$$('[data-area]').forEach(b=>b.addEventListener('click',()=>{quiz.area=b.dataset.area;$$('[data-area]').forEach(x=>{const active=x===b;x.classList.toggle('selected',active);x.setAttribute('aria-pressed',active)});}));
$$('[data-season]').forEach(b=>b.addEventListener('click',()=>{quiz.season=b.dataset.season;$$('[data-season]').forEach(x=>{const active=x===b;x.classList.toggle('selected',active);x.setAttribute('aria-pressed',active)});}));
$$('[data-method]').forEach(b=>b.addEventListener('click',()=>{saveContact();contactDrafts[quiz.method]={contact:quiz.contact,canCall:quiz.canCall};quiz.method=b.dataset.method;const draft=contactDrafts[quiz.method];quiz.contact=draft?.contact??'';quiz.canCall=quiz.method==='Телефон'||(draft?.canCall??false);renderQuiz();$('[data-method=\"'+quiz.method+'\"]')?.focus({preventScroll:true});}));
$('#contact-value')?.addEventListener('blur',()=>{saveContact();if(quiz.contact||$('#contact-value').getAttribute('aria-invalid')==='true')validateContact();});
$('#contact-value')?.addEventListener('input',()=>{if($('#contact-value').getAttribute('aria-invalid')==='true'){saveContact();if(contactIsValid()){$('#contact-error').textContent='';$('#contact-value').removeAttribute('aria-invalid');}}});
$('#contact-form')?.addEventListener('submit',e=>{e.preventDefault();saveContact();if(!validateContact()){$('#contact-value').focus();return;}renderResult();});}
function contactIsValid(){return quiz.method==='Telegram'?/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(quiz.contact):/^\+?[\d\s()\-]{10,25}$/.test(quiz.contact)&&quiz.contact.replace(/\D/g,'').length>=10;}
function validateContact(){const valid=contactIsValid();$('#contact-error').textContent=valid?'':quiz.method==='Telegram'?'Введите username Telegram: от 5 до 32 латинских букв, цифр или знаков подчёркивания.':'Введите номер телефона, не менее 10 цифр.';if(valid)$('#contact-value').removeAttribute('aria-invalid');else $('#contact-value').setAttribute('aria-invalid','true');return valid;}

function saveContact(){if($('#delivery-place'))quiz.place=$('#delivery-place').value.trim();if($('#contact-name'))quiz.name=$('#contact-name').value.trim();if($('#contact-value'))quiz.contact=$('#contact-value').value.trim();if($('#can-call'))quiz.canCall=$('#can-call').checked;}
function resultRows(){const m=models.find(x=>x.id===quiz.model);return [...(quiz.purpose?[['Запрос','Обсудить посещение производства']]:[['Дом',m?m.title:'Нужна помощь с подбором'],['Комплектация',m&&quiz.edition!=null?packageNames[quiz.edition]:'Подобрать комплектацию'],...(m&&quiz.edition!=null?[['Цена комплектации',money(m.prices[quiz.edition])+' — каталог на 02.11.2026; требуется подтверждение']]:[]),['Площадь',quiz.area],['Использование',quiz.season],['Участок',quiz.place||'Место установки уточним']]),[quiz.purpose?'Способ связи':'Получение сметы',quiz.method],['Контакт',quiz.contact],['Можно позвонить',quiz.method!=='Telegram'&&quiz.canCall?'Да':'Нет'],...(quiz.name?[['Имя',quiz.name]]:[])];}
function requestText(){return 'Домики-Всем — пример заявки\nДемонстрация. Заявка не отправлена.\nЦена комплектации не является итоговой стоимостью на участке.\n\n'+resultRows().map(([a,b])=>a+': '+b).join('\n');}
function renderResult(){$('#quiz-content').innerHTML=`<div class="success-symbol" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><p class="quiz-step-label">Так будет выглядеть обращение</p><h2 class="quiz-title" id="quiz-title" tabindex="-1">Ваши пожелания собраны.</h2><p class="quiz-description">Это пример заявки. Она не отправлена компании. В рабочем сайте эти данные получит менеджер для подготовки расчёта.</p><dl class="result-list">${resultRows().map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl><div class="quiz-actions"><button class="text-button" id="edit-result">← Изменить</button><button class="button" id="copy-result">Скопировать пожелания</button></div><div class="result-export"><button class="text-button" id="download-result">Скачать текстовый файл ↓</button><p id="copy-status" role="status" aria-atomic="true"></p></div>`;$('#quiz-title').focus({preventScroll:true});$('#edit-result').addEventListener('click',()=>{quiz.step=3;renderQuiz();});$('#copy-result').addEventListener('click',async()=>{const button=$('#copy-result');const status=$('#copy-status');button.disabled=true;button.textContent='Копируем…';try{await navigator.clipboard.writeText(requestText());button.textContent='Скопировано';status.textContent='Пожелания скопированы. Их можно вставить в сообщение. Компания их ещё не получила.';}catch{button.textContent='Скопировать пожелания';status.textContent='Браузер не разрешил копирование. Скачайте текстовый файл ниже.';}finally{button.disabled=false;}});$('#download-result').addEventListener('click',()=>{const text=requestText();const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='domiki-vsem-primer-zayavki.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
const infoDialog=$('#info-dialog');$('#concept-info').addEventListener('click',()=>{lastFocused=document.activeElement;infoDialog.showModal();document.body.style.overflow='hidden';});$('.close-info').addEventListener('click',()=>infoDialog.close());infoDialog.addEventListener('close',()=>{document.body.style.overflow='';lastFocused?.focus()});
let catalogLoading=false;
async function init(){
 if(catalogLoading)return;
 catalogLoading=true;
 const origin=document.activeElement?.id;
 const dependent=[...$$('input[name="hero-edition"]'),$('#mobile-menu-quiz'),...$$('[data-quiz]')];
 dependent.forEach(el=>el.disabled=true);
 $('#hero-data-retry').disabled=true;
 if($('#catalog-data-retry'))$('#catalog-data-retry').disabled=true;
 if(!$('#hero-data-feedback').hidden)$('#hero-data-status').textContent='Загружаем каталог…';
 try{
  const response=await fetch('models.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Каталог недоступен');
  const data=await response.json();
  if(!Array.isArray(data)||!data.some(m=>m.id==='1'&&Array.isArray(m.prices)&&m.prices.length===3))throw new Error('Неверные данные каталога');
  models=data;
  $('#hero-data-feedback').hidden=true;$('.hero-offer').classList.remove('has-data-error');
  renderCatalog();renderHeroOffer();
  if(!['hero-data-retry','catalog-data-retry'].includes(origin)||/^#house-\d+$/.test(location.hash))route();
 }catch(e){
  $('.hero-offer').classList.add('has-data-error');$('#hero-data-feedback').hidden=false;
  $('#hero-data-status').textContent='Каталог не загрузился. Чтобы сравнить комплектации и цены, повторите загрузку.';
  $('#catalog-count').textContent='Каталог временно недоступен';
  $('#model-grid').innerHTML='<div class="catalog-load-error"><h3 id="catalog-load-title" tabindex="-1">Каталог не загрузился</h3><p>Проверьте соединение и попробуйте ещё раз. Изображение дома на первом экране можно рассмотреть отдельно.</p><button class="button" id="catalog-data-retry" type="button">Повторить загрузку каталога ↻</button></div>';
  $('#catalog-data-retry').addEventListener('click',init);
  console.error(e);
 }finally{
  catalogLoading=false;dependent.forEach(el=>el.disabled=!models.length);$('#hero-data-retry').disabled=false;
  if(!models.length&&['hero-data-retry','catalog-data-retry'].includes(origin))$('#'+origin).focus({preventScroll:true});
  if(models.length&&$('#detail-page').hidden&&origin==='hero-data-retry')$('input[name="hero-edition"]:checked').focus({preventScroll:true});
  if(models.length&&$('#detail-page').hidden&&origin==='catalog-data-retry'){$('#catalog-title').tabIndex=-1;$('#catalog-title').focus({preventScroll:true});}
 }
}
$('#hero-data-retry').addEventListener('click',init);
init();

$('#tour-request')?.addEventListener('click',()=>openQuiz(null,false,'tour'));

$$('a.brand').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();location.hash='';route();window.scrollTo({top:0,behavior:'instant'});}));

const readinessCopy=[
 ['Холодный контур','Есть основная конструкция и наружный облик дома. Утепление и внутреннее обустройство можно планировать следующим этапом.'],
 ['Тёплый контур','Конструкция уже дополнена утеплением и изоляцией. Внутренние поверхности и инженерные решения обсуждаем отдельно.'],
 ['С чистовой отделкой','Внутренние поверхности отделаны. Инженерные системы, мебель и готовность к проживанию проверяем отдельно в смете.']
];
function selectReadiness(button){const i=Number(button.dataset.readiness);$$('[data-readiness]').forEach(b=>{const active=b===button;b.classList.toggle('package-featured',active);b.setAttribute('aria-pressed',String(active));});$('#readiness-title').textContent=readinessCopy[i][0];$('#readiness-copy').textContent=readinessCopy[i][1];$('#readiness-catalog').textContent='Смотреть цены: '+packageNames[i].toLowerCase()+' ↗';}
$$('[data-readiness]').forEach(b=>{b.addEventListener('click',()=>selectReadiness(b));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectReadiness(b);}});});

$('#readiness-catalog').addEventListener('click',()=>{const index=Number($('[data-readiness][aria-pressed=\"true\"]').dataset.readiness);applyCatalogEdition(index);});

$('#compare-return').addEventListener('click',()=>{comparisonOpen=false;updateComparison();$('#catalog-title').setAttribute('tabindex','-1');$('#catalog-title').focus();});

$$('[data-catalog-view]').forEach(button=>button.addEventListener('click',()=>{
 state.catalogView=button.dataset.catalogView;
 houseChoices.forEach((choice,id)=>houseChoices.set(id,{...choice,gallery:state.catalogView==='plan'?1:0}));
 $$('[data-catalog-view]').forEach(b=>b.setAttribute('aria-pressed',b===button));
 renderCatalog();
}));

// Store experiment: section parts rise in as they reach the viewport. Content stays visible
// without script, without IntersectionObserver and under reduced motion.
(()=>{
 if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const groups=['.store-types h2','.store-type','.section-heading','.package-choice','.production-top','.production-tab','.real-houses figure','.process-list li','.faq-layout>h2','.faq-list details','.final-section'];
 const items=[];
 groups.forEach(sel=>$$(sel).forEach((el,i)=>{el.style.setProperty('--reveal-i',i%4);items.push(el)}));
 if(!items.length)return;
 document.documentElement.classList.add('js-reveal');
 const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
 items.forEach(el=>{el.classList.add('reveal');io.observe(el)});
})();
