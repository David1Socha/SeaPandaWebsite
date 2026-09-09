// Progressive enhancement: navigation, articles and media links work without JS.
const dialog = document.querySelector('.media-dialog');
const content = dialog?.querySelector('.dialog-content');
if (dialog && content && typeof dialog.showModal === 'function') {
  const close = () => dialog.close();
  dialog.querySelector('.dialog-close').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  dialog.addEventListener('close', () => content.replaceChildren());
  document.querySelectorAll('a[data-video], a.mfp-image').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      let media;
      if (link.hasAttribute('data-video')) {
        const videoUrl = new URL(link.href);
        const videoId = videoUrl.searchParams.get('v');
        if (!/^[\w-]{11}$/.test(videoId || '')) return;
        media = document.createElement('iframe');
        media.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
        media.title = link.getAttribute('aria-label') || 'Game trailer';
        media.allow = 'autoplay; encrypted-media; picture-in-picture';
        media.allowFullscreen = true;
      } else {
        media = document.createElement('img');
        media.src = link.href;
        media.alt = link.querySelector('img')?.alt || 'Game screenshot';
      }
      event.preventDefault();
      content.replaceChildren(media);
      dialog.showModal();
    });
  });
}
