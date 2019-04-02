document.addEventListener('DOMContentLoaded', () => {

  const slides = selectAll('slide', (slide, i) => {
    slide.id = i;
    slide.prepend(createAnchor(i));
    updateFocusInfo(slide);
  });

  const slidesCount = slides.length;
  const editors = [];

  const isTouchDevice = ('ontouchstart' in window);
  if (isTouchDevice) {
    document.body.setAttribute('touch-device', true);
  }

  let current = getHashSlide();
  if (current) {
    jump(current);
    let el = document.querySelector(`[name="${ current }"]`);
    if (el) el.scrollIntoView();
  }

  selectAll('[bg]', el => {
    let bg = el.getAttribute('bg');
    if (bg) {
      if (!/\./.test(bg))  bg += '.png';
      el.style.backgroundImage = `url(assets/images/${ bg })`;
    }
  });

  selectAll('textarea[code]', block => {
    let content = normalizeIndent(block.value).trim();
    let sample = document.createElement('div');
    sample.className = 'code-sample';
    block.parentNode.replaceChild(sample, block);

    let live = block.hasAttribute('live');
    let doodle = sample.parentNode.querySelector('css-doodle');

    let options = {
      mode: block.getAttribute('code') || 'css',
      value: content,
      theme: 'dracula',
      tabSize: 2
    };

    if (!live) {
      Object.assign(options, {
        readOnly: isTouchDevice ? 'nocursor' : true,
        cursorBlinkRate: -1
      });
    }

    let editor = CodeMirror(sample, options)
    editors.push(editor);

    if (live && doodle) {
      let timer = null;
      doodle.update(editor.getValue());
      editor.on('change', (_, obj) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          doodle.update(editor.getValue());
        }, 300);
      });
    }
  });

  selectAll('css-doodle', doodle => {
    if (doodle.hasAttribute('click-to-update')) {
      doodle.addEventListener('click', e => {
        doodle.update();
      });
    }
    if (doodle.hasAttribute('auto-update')) {
      let timer;
      let intersectionObserver = new IntersectionObserver(entries => {
        if (entries[0].intersectionRatio <= 0) {
          clearInterval(timer);
        } else {
          doodle.update();
          let auto = doodle.getAttribute('auto-update');
          if (auto !== 'once') {
            let delay = +auto || 3e3;;
            timer = setInterval(() => {
              doodle.update();
            }, delay);
          }
        }
      });
      intersectionObserver.observe(doodle);
    }
  });

  selectAll('.dynamic-border-radius', box => {
    box.addEventListener('mouseleave', e => {
      box.removeAttribute('onhover');
    });
    box.addEventListener('mousemove', e => {
      box.setAttribute('onhover', true);
      var size = parseInt(getComputedStyle(box).width);
      var x = size * .3 * .7 + .7 * e.offsetX;
      var y = size * .3 * .7 + .7 * e.offsetY;
      box.style.setProperty('--x', x);
      box.style.setProperty('--y', y);
      box.style.setProperty('--size', size);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.keyCode == 37 || e.keyCode == 38) {
      prev();
    }
    if (e.keyCode == 39 || e.keyCode == 40) {
      next();
    }
  });

  window.addEventListener('hashchange', e => {
    let hash = getHashSlide();
    let el = document.querySelector(`[name="${ hash }"]`);
    if (el) el.scrollIntoView();
    jumpSlide(hash);
  });

  window.addEventListener('resize', e => {
    slides[current].scrollIntoView();
  });

  document.addEventListener('dblclick', e => {
    document.documentElement.webkitRequestFullscreen();
  });

  let controls = document.querySelector('controls');
  controls.addEventListener('click', e => {
    if (e.target.hasAttribute('action-next')) {
      next();
    }
    if (e.target.hasAttribute('action-prev')) {
      prev();
    }
  });

  function selectAll(selector, fn) {
    let elments = document.querySelectorAll(selector);
    if (fn) {
      Array.from(elments || []).forEach(fn);
    }
    return elments;
  }

  function getHashSlide() {
    let hash = location.hash.substr(1);
    if (/\d/.test(hash)) return +hash;
    return 0;
  }

  function createAnchor(n) {
    let a = document.createElement('a');
    a.name = n;
    return a;
  }

  function updateFocusInfo(el, info = {}) {
    let focusList = el.querySelector('[focus]');
    if (focusList) {
      let items = focusList.querySelectorAll('li');
      focusList.setAttribute('focus-curr', info.curr || 0);
      focusList.setAttribute('focus-max', info.max || items.length - 1);
      let old = focusList.querySelector('[active]');
      if (old) { old.removeAttribute('active'); }
      items[info.curr || 0].setAttribute('active', true);
    }
  }

  function normalizeIndent(input) {
    let temp = input.replace(/^\n+/g, '');
    let len = temp.length - temp.replace(/^\s+/g, '').length;
    let result = input.split('\n').map(n => (
      n.replace(new RegExp(`^\\s{${len}}`, 'g'), '')
    ));
    return result.join('\n');
  }

  function jumpFocus(n) {
    let curr = document.querySelector('slide[curr]');
    if (curr) {
      let focusList = curr.querySelector('[focus]');
      if (focusList) {
        let list = focusList.querySelectorAll('li');
        let length = list.length;
        let active = focusList.querySelector('[active]');
        updateFocusInfo(curr, {
          curr: n
        });
        editors.forEach(n => n.refresh());
      }
    }
  }

  function jumpSlide(n) {
    if (n >= 0 && n < slidesCount) {
      let curr = document.querySelector('slide[curr]');
      if (curr) {
        curr.removeAttribute('curr');
      }
      current = n;
      location.hash = '#' + current;
      slides[n].setAttribute('curr', true);
      editors.forEach(n => n.refresh());
    }
  }

  function jump(n, dir) {
    let curr = document.querySelector('slide[curr]');
    let focusList = curr && curr.querySelector('[focus]');

    if (focusList) {
      let focusCurr = +(focusList.getAttribute('focus-curr'));
      let focusMax = +(focusList.getAttribute('focus-max'));
      if ((dir == 'next' && focusCurr < focusMax) || (dir == 'prev' && focusCurr > 0)) {
        jumpFocus(dir == 'next' ? focusCurr + 1 : focusCurr - 1);
      } else {
        jumpSlide(n);
      }
    } else {
      jumpSlide(n);
    }
  }

  function next() {
    jump(current + 1, 'next');
  }

  function prev() {
    jump(current - 1, 'prev');
  }

});
