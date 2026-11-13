/* Independent PWA layer: never clears learning data. */
(()=>{'use strict';
const bar=document.createElement('div');bar.id='pwa-status';bar.role='status';bar.setAttribute('aria-live','polite');bar.hidden=true;document.querySelector('.topbar').after(bar);
let registration,ready=false,failed=false;
function show(){bar.replaceChildren();let message='';
 if(location.protocol==='file:')message='Installation et mode hors connexion : ouvrez la version HTTPS. Les fichiers locaux restent utilisables.';
 else if(!isSecureContext||!('serviceWorker'in navigator))message='Mode hors connexion indisponible ici. Utilisez Safari avec l’adresse HTTPS publiée.';
 else if(!navigator.onLine)message=ready?'Hors connexion · exercices disponibles. Les voix de synthèse dépendent de votre iPhone.':'Hors connexion · téléchargement initial non confirmé. Reconnectez-vous pour préparer les exercices.';
 else if(failed)message='Mode hors connexion non préparé. Vérifiez la connexion et rechargez.';
 else if(registration&&!ready)message='Préparation des exercices hors connexion…';
 if(registration?.waiting){message='Une mise à jour est prête. Votre progression sera conservée.';const button=document.createElement('button');button.className='btn secondary small';button.textContent='Mettre à jour';button.onclick=()=>{if(confirm('Recharger l’application ? La session sauvegardée pourra être reprise.'))registration.waiting?.postMessage('ACTIVATE_UPDATE');};bar.append(button);}
 if(message)bar.prepend(document.createTextNode(message));bar.hidden=!message;
}
addEventListener('online',show);addEventListener('offline',show);show();
if(!isSecureContext||!/^https?:$/.test(location.protocol)||!('serviceWorker'in navigator))return;
let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;if(ready)location.reload();});
navigator.serviceWorker.register('./sw.js').then(async reg=>{registration=reg;ready=!!reg.active;show();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){ready=!!reg.active;show();}if(worker.state==='redundant'){failed=true;show();}});});await navigator.serviceWorker.ready;ready=true;show();}).catch(()=>{failed=true;show();});
})();
