/* 로딩 화면 (피그마 'iPhone 17 - 2·4·5', 402×874)
   도형이 바닥(그림자)에 한 번 튕기고, 다시 올라가면서 동전 뒤집듯 다음 도형으로 바뀜
   네모(연두) → 동그라미(주황) → 세모(초록) → 다시 네모 …
   - 세 도형을 한 번씩은 다 보여 준 뒤, 글을 다 불러오면 도형이 맨 위에 왔을 때 사라짐
   - 주소 끝에 #loader 를 붙이면 로딩 화면이 사라지지 않음 (모션 확인용) */
(() => {
  const el = document.getElementById('loader');
  if (!el) return;
  const box = el.querySelector('.loader-shape');
  const flip = el.querySelector('.loader-flip');
  const shadow = el.querySelector('.loader-shadow');

  // 피그마에서 꺼낸 도형 (크기·색 그대로)
  const SHAPES = [
    '<svg width="62" height="62" viewBox="0 0 62 62"><rect width="62" height="62" rx="2" fill="#E2F268"/></svg>',
    '<svg width="67" height="67" viewBox="0 0 67 67"><circle cx="33.5" cy="33.5" r="33.5" fill="#E98868"/></svg>',
    '<svg width="60" height="60" viewBox="0 0 60 60"><path d="M55.8905 0.589681C57.1505 -0.670108 59.3046 0.222263 59.3046 2.004L59.3046 57.2966C59.3046 58.4012 58.4092 59.2966 57.3046 59.2966H2.00398C0.222096 59.2966 -0.670209 57.1422 0.589861 55.8823L55.8905 0.589681Z" fill="#6DAD93"/></svg>',
  ];

  const T = 1100;          // 한 번 튕기는 데 걸리는 시간 (ms). 줄이면 빨라짐
  const DROP = 'calc(var(--u) * 69)';   // 떨어지는 거리: 도형 아래쪽이 그림자 가운데에 닿을 때까지 (피그마 468 → 537)
  const MIN_BOUNCES = 3;   // 최소 튕기는 횟수 (세 도형을 한 번씩)
  const keep = location.hash === '#loader';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let i = 0, bounces = 0, ready = false, closing = false;
  flip.innerHTML = SHAPES[0];

  function bounce() {
    if (still) {
      // 움직임 줄이기 설정이면 튕기지 않고 도형만 바뀜
      setTimeout(() => { flip.innerHTML = SHAPES[i = (i + 1) % 3]; after(); }, 700);
      return;
    }
    // 떨어지기(점점 빠르게) → 바닥에서 납작 → 튀어 오르며 길쭉 → 맨 위에서 잠깐 멈춤
    const fall = 'cubic-bezier(.55, 0, 1, .45)', rise = 'cubic-bezier(0, .55, .45, 1)';
    box.animate([
      { transform: 'translateY(0) scale(1, 1)', easing: fall },
      { transform: `translateY(${DROP}) scale(1, 1)`, offset: 0.4 },
      { transform: `translateY(${DROP}) scale(1.2, .76)`, offset: 0.47 },
      { transform: `translateY(${DROP}) scale(1, 1)`, offset: 0.52, easing: rise },
      { transform: 'translateY(calc(var(--u) * 30)) scale(.92, 1.1)', offset: 0.64 },
      { transform: 'translateY(0) scale(1, 1)', offset: 0.88 },
      { transform: 'translateY(0) scale(1, 1)' },
    ], { duration: T });
    // 올라가는 동안 동전 뒤집듯 가로로 좁아졌다가 다음 도형으로 펼쳐짐
    flip.animate([
      { transform: 'scaleX(1)', offset: 0 },
      { transform: 'scaleX(1)', offset: 0.54, easing: 'ease-in' },
      { transform: 'scaleX(0)', offset: 0.64, easing: 'ease-out' },
      { transform: 'scaleX(1)', offset: 0.76 },
      { transform: 'scaleX(1)', offset: 1 },
    ], { duration: T });
    setTimeout(() => { flip.innerHTML = SHAPES[i = (i + 1) % 3]; }, T * 0.64);
    // 그림자: 도형이 바닥에 가까울수록 작고 진하게
    shadow.animate([
      { transform: 'scale(1)', opacity: 1, easing: fall },
      { transform: 'scale(.72)', opacity: 1, filter: 'brightness(.88)', offset: 0.4 },
      { transform: 'scale(.82)', opacity: 1, filter: 'brightness(.88)', offset: 0.47 },
      { transform: 'scale(.72)', opacity: 1, filter: 'brightness(.88)', offset: 0.52, easing: rise },
      { transform: 'scale(1)', opacity: 1, offset: 0.88 },
      { transform: 'scale(1)', opacity: 1 },
    ], { duration: T });
    setTimeout(after, T);
  }

  function after() {
    bounces++;
    if (ready && bounces >= MIN_BOUNCES && !keep) return close();
    bounce();
  }

  function close() {
    if (closing) return;
    closing = true;
    el.classList.add('out');
    setTimeout(() => el.remove(), 500);
  }

  // app.js가 글을 다 불러오면 부름
  window.loaderReady = () => { ready = true; };
  // 혹시 불러오기가 너무 오래 걸려도 8초 뒤엔 넘어감
  setTimeout(() => { ready = true; }, 8000);

  bounce();
})();
