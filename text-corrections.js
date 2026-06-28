(function(){
  if (window.__schoolTimerTextCorrectionsLoaded) return;
  window.__schoolTimerTextCorrectionsLoaded = true;

  const corrections = new Map([
    ['الحصة الحاليه', 'الحصة الحالية'],
    ['الحصه الحالية', 'الحصة الحالية'],
    ['الحصه الحاليه', 'الحصة الحالية']
  ]);

  function normalizeTextNode(node){
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const value = node.nodeValue;
    if (!value) return;

    let next = value;
    corrections.forEach((correct, wrong) => {
      next = next.split(wrong).join(correct);
    });

    if (next !== value) node.nodeValue = next;
  }

  function walk(root){
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) normalizeTextNode(node);
  }

  function apply(){
    walk(document.body);
  }

  function start(){
    apply();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) normalizeTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) walk(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
