"use client";
// ฉาก "โต๊ะเรียน 3 มิติ" หน้าแรก KruHeem — พอร์ตจากต้นแบบ KruHeem Study Desk.dc.html
// (สเปก ~/Downloads/KruHeem-Study-Desk-SPEC.md ภาคผนวก A = render() ล่างสุด, ภาคผนวก B = คลาสนี้)
// ตั้งใจคงโค้ดต้นแบบไว้ใกล้คำต่อคำ เพื่อเทียบกับสเปกได้ทีละบรรทัด — จุดที่แก้จากต้นแบบมีคอมเมนต์ "[พอร์ต]"
// ข้อมูลสมมติในต้นแบบ (คอร์ส/ราคา/รีวิว/วันสอบ/คอร์สของฉัน) ถูกแทนด้วยข้อมูลจริงจาก props
// (ดู components/desk/StudyDesk.tsx และ lib/deskHomeData.ts)
/* eslint-disable */
import React from "react";
import * as THREE from "three";
import { css, DESK_PAGE_CSS } from "./deskCss";

const HOVER_CSS = ".khd-h0:hover{color:var(--chipInk) !important;transform:translateY(-1px) !important}\n.khd-h1:hover{transform:scale(1.06) !important}\n.khd-h2:hover{transform:rotate(-15deg) scale(1.06) !important}\n.khd-h3:hover{color:#b45309 !important}\n.khd-h4:hover{color:#fff !important}\n.khd-h5:hover{color:#0f172a !important}\n.khd-h6:hover{background:rgba(15,23,42,.9) !important}\n.khd-h7:hover{background:#e2e8f0 !important}\n.khd-h8:hover{border-color:#94a3b8 !important}\n.khd-h9:hover{color:#1e293b !important;transform:translateY(-3px) !important}\n.khd-h10:hover{color:#0f172a !important;transform:translateY(-3px) !important}\n.khd-h11:hover{transform:translateY(-3px) !important}\n.khd-h12:hover{color:#0d9488 !important}";

class StudyDeskScene extends React.Component {
  // [พอร์ต] เปิดโหมดลดการเคลื่อนไหวในเครื่อง → ข้ามอินโทรกล้องบิน
  state = { intro: (() => { try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return false; return localStorage.getItem('kh_desk_intro') !== '1'; } catch (e) { return true; } })(), music: (() => { try { return localStorage.getItem('kh_desk_music') !== '0'; } catch (e) { return true; } })(), kruMsg: 'สวัสดีครับ! แตะของบนโต๊ะได้เลย', muted: (() => { try { return localStorage.getItem('kh_desk_muted') === '1'; } catch (e) { return false; } })(), vw: innerWidth, vh: innerHeight, panel: null, hover: null, night: false, cat: (this.props.data && this.props.data.cats && this.props.data.cats[0]) || '', now: Date.now(), quoteIdx: 0, modal: false };
  rootRef = React.createRef(); canvasHostRef = React.createRef(); tipRef = React.createRef(); kruRef = React.createRef(); radioPopRef = React.createRef(); heroRef = React.createRef(); dockRef = React.createRef();

  MENU_ALL = [
    { k: 'courses', t: 'คอร์สเรียน', o: 'ตั้งหนังสือคอร์ส', d: 'เลือกคอร์สตามระดับชั้น เรียนได้ทุกที่' },
    { k: 'exams', t: 'คลังข้อสอบ', o: 'กองข้อสอบ', d: 'ฝึกทำข้อสอบจริง พร้อมเฉลย', href: '/exam', cta: 'เริ่มทำข้อสอบ' },
    { k: 'mycourse', t: 'คอร์สของฉัน', o: 'แล็ปท็อป', d: 'เข้าสู่บทเรียนที่ลงทะเบียนไว้ เรียนต่อจากจุดที่ค้างไว้ได้ทันที' },
    { k: 'summary', t: 'สรุปเนื้อหา', o: 'สมุดโน้ต', d: 'สรุปสั้น อ่านทวนก่อนสอบ', href: '/summary', cta: 'อ่านสรุป' },
    { k: 'tips', t: 'เทคนิคการเรียน', o: 'หนังสือเทคนิค', d: 'บทความเทคนิคการเรียนจากครูฮีม', href: '/blog', cta: 'อ่านบทความ' },
    { k: 'countdown', t: 'นับถอยหลังสู่วันสอบ', o: 'ปฏิทิน', d: '' },
    { k: 'reviews', t: 'ผลตอบรับ', o: 'โพสต์อิทบนกระดาน', d: 'จากน้องๆ และผู้ปกครอง' },
    { k: 'story', t: 'เรื่องของครูฮีม', o: 'แก้วน้ำ', d: 'เหมือนเติมน้ำใส่แก้วที่รั่ว' },
    { k: 'apply', t: 'สมัครเรียน', o: 'ใบสมัครบนคลิปบอร์ด', d: 'วิธีสมัคร แจ้งโอน คำถามที่พบบ่อย' },
    { k: 'contact', t: 'ติดต่อครูฮีม', o: 'โทรศัพท์มือถือ', d: 'LINE · Facebook · Email' }
  ];
  // [พอร์ต] ปิดนับถอยหลังจากหลังบ้าน (/admin/countdown) → ไม่มีปฏิทินบนโต๊ะ และไม่มีเมนูนี้
  get MENU() { return this.cdOn() ? this.MENU_ALL : this.MENU_ALL.filter(m => m.k !== 'countdown'); }
  cdOn() { return !this.props.countdown || this.props.countdown.enabled !== false; }
  LAMP = { k: 'lamp', t: 'เปิด/ปิดไฟ', o: 'โคมไฟ', d: 'สลับโหมดกลางวัน / กลางคืน' };
  // [พอร์ต] ต้นแบบใส่ข้อมูลสมมติไว้ตรงนี้ (QUOTES/FEAT/REVIEWS/CATS/COURSES) — แทนด้วยข้อมูลจริงจาก props
  //   คำคม = ชุดเดียวกับการ์ดนับถอยหลังในหลังบ้าน · คอร์ส/รีวิว/รายการล่าสุด = lib/deskHomeData.ts
  get QUOTES() { const q = this.props.countdown && this.props.countdown.quotes; return q && q.length ? q : ['เก่งขึ้นทุกวัน แม้ทีละก้าว']; }
  get FEAT() { return (this.props.data && this.props.data.feat) || {}; }
  // โพสต์อิท 6 ใบ: สลับเหลือง/ชมพูตามลำดับ (kid = ใช้แค่เลือกสี ไม่ได้บอกว่าใครเขียน — ข้อมูลจริงไม่มีบอก)
  get REVIEWS() { return ((this.props.data && this.props.data.reviews) || []).map((r, i) => Object.assign({}, r, { kid: i % 2 === 0 })); }
  SPINE = ['#0f766e', '#d97706', '#4f46e5', '#e11d48', '#0e7490', '#881337'];
  get CATS() { return (this.props.data && this.props.data.cats) || []; }
  // สันหนังสือบนโต๊ะไม่เกิน 5 เล่ม (+ เล่มบน "คอร์สทั้งหมด") ไม่งั้นตั้งหนังสือสูงจนบังของอื่น — หมวดที่เหลือยังเลือกได้ในแผง
  get BOOK_CATS() { return this.CATS.slice(0, 5); }
  get COURSES() { return (this.props.data && this.props.data.coursesByCat) || {}; }

  // [พอร์ต] วันสอบจริงจากหลังบ้าน (ต้นแบบตายตัว 2027-03-06)
  cdTarget() { const c = this.props.countdown; return c && Number.isFinite(c.targetMs) ? c.targetMs : Date.parse('2027-03-06T09:00:00+07:00'); }
  daysLeft(now) { return Math.max(0, Math.floor((this.cdTarget() - now) / 86400000)); }

  componentDidMount() {
    this._dead = false; this.homeOk = false; this._errd = false;
    if (process.env.NODE_ENV !== 'production') window.__desk = this; // ไว้ตรวจฉากตอนพัฒนา
    try { this.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { this.reduced = false; }
    this.tick = setInterval(() => this.setState({ now: Date.now() }), 1000);
    this.qt = setInterval(() => this.setState(s => ({ quoteIdx: (s.quoteIdx + 1) % this.QUOTES.length })), 6000);
    this.onKey = (e) => { if (e.key === 'Escape') this.closePanel(); };
    this.onResize = () => { this.setState({ vw: innerWidth, vh: innerHeight }); requestAnimationFrame(() => this.resize()); };
    addEventListener('orientationchange', this.onResize);
    addEventListener('keydown', this.onKey); addEventListener('resize', this.onResize);
    if (this.props.nightMode) this.setNight(true); else this.applyTheme(false);
    this.waitThree();
  }
  componentWillUnmount() {
    // [พอร์ต] Next.js เปลี่ยนหน้าโดยไม่รีโหลด → ต้องหยุดเพลง/ปิดเสียง/คืนการ์ดจอเอง ไม่งั้นเพลงยังดังต่อในหน้าอื่น
    this._dead = true;
    try { if (this.mus) { this.mus.cr.stop(); this.mus.g.disconnect(); this.mus = null; } } catch (e) {}
    try { if (this.ac) { this.ac.close(); this.ac = null; } } catch (e) {}
    removeEventListener('orientationchange', this.onResize);
    if (this.R) { try { this.R.forceContextLoss(); } catch (e) {} }
    clearInterval(this.musT);
    clearInterval(this.tick); clearInterval(this.qt); clearTimeout(this.tw0); cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this.onKey); removeEventListener('resize', this.onResize);
    if (this.R) { this.R.dispose(); this.R.domElement.remove(); this.R = null; }
  }
  componentDidUpdate(prev) {
    if (prev.deskTone !== this.props.deskTone && this.deskMat) [this.deskMat, this.deskMat2].forEach((m, i) => m.color.set(i ? this.mix(this.props.deskTone || '#74472a', '#000000', .18) : (this.props.deskTone || '#74472a')));
    if (prev.floorColor !== this.props.floorColor && this.floorMat) this.floorMat.color.set(this.props.floorColor || '#b9c3cf');
    if ((prev.showPromo !== this.props.showPromo || prev.promoText !== this.props.promoText) && this._lastHome) { this._roomKey = null; this.placeRoom(this._lastHome); }
    if (prev.nightMode !== this.props.nightMode) this.setNight(!!this.props.nightMode);
    if (prev.bgColor !== this.props.bgColor) this.applyTheme();
  }
  hasGL() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }
  waitThree() {
    if (this.state.noGL) return;
    if (!this.hasGL()) { this.setState({ noGL: true, intro: false }); return; } if (THREE) this.init3D(); else this.tw0 = setTimeout(() => this.waitThree(), 80); }

  setNight(on) { this.setState({ night: on }); this.applyTheme(on); }
  mix(a, b, t) {
    const p = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
    const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  lum(hex) { const h = hex.replace('#', ''); const c = [0, 2, 4].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  applyTheme(night) {
    const r = this.rootRef.current; if (!r) return;
    if (night === undefined) night = this.state.night;
    const v = { '--ink': '#f8fafc', '--muted': '#d7e7e4', '--accent': night ? '#5eead4' : '#0f766e', '--chip': night ? 'rgba(30,41,59,.85)' : 'rgba(255,255,255,.92)', '--chipline': night ? 'rgba(148,163,184,.25)' : 'rgba(255,255,255,.6)', '--chipInk': night ? '#f1f5f9' : '#0f172a', '--chipMuted': night ? '#94a3b8' : '#64748b', '--hl': 'linear-gradient(90deg,#fde68a,#fbbf24 50%,#fb923c)' };
    Object.keys(v).forEach(k => r.style.setProperty(k, v[k]));
    if (this.wallMat) this.wallMat.color.set(this.props.bgColor || '#164a45');
  }
  // ---------- 3D ----------
  init3D() { try { this.init3D0(); } catch (e) { console.error(e); this.setState({ noGL: true, intro: false }); } }
  init3D0() {
    const T = this.T = THREE, host = this.canvasHostRef.current; if (!host) return;
    // [พอร์ต] ฉากถูกสร้างใหม่ได้ในอินสแตนซ์เดิม (React Strict Mode ตอนพัฒนา / กลับมาหน้านี้) —
    // ล้างค่าที่ต้นแบบถือว่า "ยังไม่เคยมี" ไม่งั้นกระดาน/โปสเตอร์จะไม่ถูกวางในฉากใหม่ (placeRoom จำคีย์เก่า)
    this._roomKey = null; this.board = null; this.tw = null; this.introOn = false; this.hoverKey = undefined; this.kruShow = undefined;
    this.nextWig = 0; this._playing = undefined; this.drawerOpen = false; this.winOpen = false; this._fpsDone = false; this._fpsN = 0; this._fpsS = 0;
    const R = this.R = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.setSize(innerWidth, innerHeight);
    R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 0.82;
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
    R.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    host.appendChild(R.domElement);
    const S = this.scene = new T.Scene();
    this.cam = new T.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
    const pm = new T.PMREMGenerator(R), es = new T.Scene();
    es.add(new T.Mesh(new T.BoxGeometry(20, 20, 20), new T.MeshBasicMaterial({ color: 0xf1ebdf, side: T.BackSide })));
    const pn = (w, h, x, y, z, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    pn(10, 5, 0, 9, 3, 0xffffff); pn(5, 8, -9, 3, 3, 0xfff3d6); pn(12, 3, 0, -9, 0, 0x8c8474);
    S.environment = pm.fromScene(es, 0.04).texture;

    this.hemi = new T.HemisphereLight(0xffffff, 0xd9cbb2, 0.55); S.add(this.hemi);
    const sun = this.sun = new T.DirectionalLight(0xfff3e0, 1.25); sun.position.set(6, 13, 7);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 10, bottom: -10, near: 1, far: 50 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; S.add(sun);
    this.fill = new T.DirectionalLight(0xdfefff, 0.35); this.fill.position.set(-8, 6, 4); S.add(this.fill);

    this.mats = {}; this.items = {}; this.hitList = []; this.order = [];
    this.tex = {}; this.makeTextures();
    this.buildRoom(); this.buildDesk(); this.buildLaptop(); if (this.cdOn()) this.buildCalendar(); this.buildLamp(); this.buildBooks();
    this.buildNotebook(); this.buildTips(); this.buildPapers(); this.buildGlass(); this.steam = []; this.buildKru(); this.buildApply(); { const sm = new Set(this._stampMeshes || []); this.hitList = this.hitList.filter(m => !sm.has(m)); } this.buildDust(); this.buildPhone(); this.buildProps(); this.buildCat(); this.buildLeaves(); this.buildSideTable(); this.compact = undefined; this.applyLayout();
    this.ring = new T.Mesh(new T.RingGeometry(0.92, 1, 72), new T.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.012; S.add(this.ring); this.ringA = 0;

    if (document.fonts) { Promise.all([document.fonts.load('600 80px Mitr'), document.fonts.load('600 40px "IBM Plex Sans Thai Looped"'), document.fonts.load('40px Itim')]).then(() => this.makeTextures(true)).catch(() => {}); }

    this.ray = new T.Raycaster(); this.ndc = new T.Vector2(9, 9); this.m = { x: 0, y: 0 }; this.mt = { x: 0, y: 0 };
    const c = R.domElement;
    c.addEventListener('pointermove', (e) => { this.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); this.mt = { x: this.ndc.x, y: this.ndc.y }; this.ptrIn = e.pointerType !== 'touch'; });
    c.addEventListener('pointerleave', () => { this.ptrIn = false; });
    c.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { this.mt = { x: 0, y: 0 }; } this.down = { x: e.clientX, y: e.clientY }; this.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); });
    this.yaw = 0; this.pitch = 0; this.yawT = 0; this.pitchT = 0;
    c.addEventListener('pointermove', (e) => { if (this.down && (e.buttons || e.pointerType === 'touch')) { const dx = e.clientX - this.down.x, dy = e.clientY - this.down.y; if (Math.hypot(dx, dy) > 8) { this.dragging = true; this.yawT = Math.max(-0.32, Math.min(0.32, (this.down.yaw || 0) - dx * 0.004)); this.pitchT = Math.max(-0.12, Math.min(0.14, (this.down.pitch || 0) + dy * 0.002)); } } });
    c.addEventListener('pointerdown', (e) => { this.ensureAudio(); if (this.down) { this.down.yaw = this.yawT; this.down.pitch = this.pitchT; } });
    c.addEventListener('pointerup', (e) => { this.dragging = false; this.lastDrag = performance.now() / 1000; });
    c.addEventListener('pointerup', (e) => { if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 8) this.clickAt(e); this.down = null; });

    const hp = this.homePose(); this.camP = hp.p.clone(); this.camT = hp.t.clone(); this.camS = hp.s;
    if (this.state.intro) { const off = hp.p.clone().sub(hp.t); off.applyAxisAngle(new T.Vector3(0, 1, 0), -0.95); off.multiplyScalar(1.85); off.y += 7; this.camP = hp.t.clone().add(off); this.camT = hp.t.clone().add(new T.Vector3(-3, 2, -2)); this.camS = 0; this.goTo(hp, 3.8); this.introOn = true; try { localStorage.setItem('kh_desk_intro', '1'); } catch (e) {} }
    [600, 1300].forEach(ms => setTimeout(() => { if (this._dead || !this.R) return; if (!this.state.panel && !this.tw) { const q = this.homePose(); this.camP.copy(q.p); this.camT.copy(q.t); this.camS = q.s; this.camSX = 0; } else if (this._lastHome) this.placeRoom(this._lastHome); }, ms));
    this.nightT = this.state.night ? 1 : 0;
    this.t0 = performance.now() / 1000; this.last = this.t0;
    this.loop();
  }

  // [พอร์ต] มือถือแนวตั้ง: ต้นแบบวางของเต็มความกว้างโต๊ะ + โต๊ะข้าง → บนจอแคบทุกอย่างเล็กจนอ่านไม่ออก
  // (ครูฮีมขอ 2026-09-25) → ย้ายของเข้ามาชิดกลางโต๊ะ ซูมกล้องเฉพาะช่วงนี้ และซ่อนกระดาน/หน้าต่าง/นาฬิกา/โปสเตอร์ครู
  // ค่า: [x, z, rotY, ขนาด] — ของที่ไม่มีในนี้อยู่ที่เดิม
  COMPACT = {
    courses: [-2.95, -1.75, 0.1, 0.9], mycourse: [0.45, -2.05, 0, 0.9], countdown: [3.2, -2.35, -0.24, 0.9], lamp: [3.6, -3.25, 0, 0.8],
    contact: [-3.3, 0.95, 0.16, 0.9], story: [-1.75, 0.95, 0, 0.9], exams: [3.05, 0.9, 0.08, 0.85],
    tips: [-3.1, 2.55, 0.16, 0.9], apply: [-0.55, 2.45, -0.06, 0.9], summary: [2.35, 2.75, -0.06, 0.95],
  };
  COMPACT_X = 4.35; // ครึ่งความกว้างที่ต้องเห็นเต็มจอ (ต้นแบบ 7.9 = โต๊ะ + โต๊ะข้าง)
  COMPACT_DIR = [0, 14, 10]; // ทิศกล้องมือถือ (ต้นแบบ 0, 8.6, 15) — มองสูงกว่าให้ของไม่บังกันและเต็มจอแนวตั้ง
  COMPACT_YF = -1.5; // ขอบล่างที่ต้องเห็น (หน้าลิ้นชัก)
  isCompact() { return innerWidth < 640 && innerHeight > innerWidth * 1.05; }
  applyLayout() {
    const c = this.isCompact(); if (c === this.compact) return false; this.compact = c;
    for (const it of this.order) {
      if (it.static || !it.g) continue;
      if (!it._d) it._d = { x: it.x, z: it.z, rotY: it.rotY, bs: it.bs || 1, rs: it.rs };
      const L = c && this.COMPACT[it.k], k = L ? L[3] : 1;
      it.x = L ? L[0] : it._d.x; it.z = L ? L[1] : it._d.z; it.rotY = L ? L[2] : it._d.rotY; it.bs = it._d.bs * k; it.rs = it._d.rs * k;
      it.g.position.x = it.x; it.g.position.z = it.z; it.g.scale.setScalar(it.bs);
    }
    this._foot = null; this.hideWall();
    return true;
  }
  // ของบนผัง (กระดาน โพสต์อิท หน้าต่าง นาฬิกา โปสเตอร์ครู ชอล์ก) → layer 1 = ไม่วาด ไม่มีเงา และแตะไม่โดน
  hideWall() {
    const L = this.compact ? 1 : 0, lay = (o) => o && o.traverse(n => n.layers.set(L));
    lay(this.board); lay(this.win); lay(this.clock); if (this.kru) lay(this.kru.g);
    (this.props3 || []).forEach(o => { if (o.tray) lay(o.g); });
  }
  M(c, o) {
    o = o || {}; const k = c + '|' + (o.r ?? .62) + '|' + (o.m ?? 0);
    if (!this.mats[k]) this.mats[k] = new this.T.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.62, metalness: o.m ?? 0, envMapIntensity: 0.45 });
    return this.mats[k];
  }
  mesh(g, m, noCast) { const x = new this.T.Mesh(g, m); x.castShadow = !noCast; x.receiveShadow = true; return x; }
  rbox(w, h, d, r, mat) {
    const T = this.T, b = Math.min(r * 0.7, h * 0.45, w * 0.3, d * 0.3), sw = w - 2 * b, sd = d - 2 * b;
    const cr = Math.max(0.001, Math.min(r, sw / 2 - 0.001, sd / 2 - 0.001));
    const s = new T.Shape(), x = -sw / 2, y = -sd / 2;
    s.moveTo(x + cr, y); s.lineTo(x + sw - cr, y); s.quadraticCurveTo(x + sw, y, x + sw, y + cr);
    s.lineTo(x + sw, y + sd - cr); s.quadraticCurveTo(x + sw, y + sd, x + sw - cr, y + sd);
    s.lineTo(x + cr, y + sd); s.quadraticCurveTo(x, y + sd, x, y + sd - cr); s.lineTo(x, y + cr); s.quadraticCurveTo(x, y, x + cr, y);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 10 });
    g.rotateX(-Math.PI / 2); g.center();
    return this.mesh(g, mat);
  }
  decal(w, h, key, parent, y) {
    const T = this.T, m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: this.tex[key], transparent: true, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; parent.add(m); return m;
  }
  add(key, g, x, z, rotY, o) {
    g.position.set(x, 0, z); g.rotation.y = rotY; this.scene.add(g);
    const it = Object.assign({ k: key, g, x, z, rotY, h: 0, v: 0, ay: 1, fd: 1, rs: 1.4, delay: 0.25 + this.order.length * 0.11 }, o || {});
    this.items[key] = it; this.order.push(it);
    g.traverse(n => { if (n.isMesh) { n.userData.key = key; this.hitList.push(n); } });
    return it;
  }

  cv(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h); return c;
  }
  tx(name, canvas) {
    const T = this.T;
    if (this.tex[name]) {
      const o = this.tex[name], im = o.image;
      if (!im || (im.width === canvas.width && im.height === canvas.height)) { o.image = canvas; o.needsUpdate = true; return; }
      o.dispose(); // [พอร์ต] ขนาดไม่เท่าเดิม → ทิ้งแล้วสร้างใหม่ (ต้นแบบเขียนทับ → ภาพกระดานเพี้ยนบนมือถือ)
    }
    const t = new T.CanvasTexture(canvas); t.encoding = T.sRGBEncoding; t.anisotropy = 8; this.tex[name] = t;
  }
  makeTextures() {
    const F = "'Mitr', sans-serif", B = "'IBM Plex Sans Thai Looped', sans-serif";
    const rr = (x, X, Y, W, H, R) => { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); };
    this.tx('screen', this.cv(1024, 640, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0f766e'); g.addColorStop(1, '#134e4a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      ['#f87171', '#fbbf24', '#34d399'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(46 + i * 30, 40, 9, 0, 7); x.fill(); });
      x.fillStyle = '#fff'; x.font = `600 92px ${F}`; x.fillText('คอร์สของฉัน', 70, 200);
      x.fillStyle = 'rgba(255,255,255,.75)'; x.font = `500 34px ${B}`; x.fillText('บทที่ 3 · สมการเชิงเส้น', 74, 262);
      x.fillStyle = 'rgba(255,255,255,.16)'; rr(x, 74, 300, 876, 22, 11); x.fill(); x.fillStyle = '#5eead4'; rr(x, 74, 300, 876 * .25, 22, 11); x.fill();
      x.fillStyle = '#b45309'; rr(x, 74, 400, 876, 150, 40); x.fill();
      x.fillStyle = '#fbbf24'; rr(x, 74, 388, 876, 150, 40); x.fill();
      x.fillStyle = '#0f172a'; x.beginPath(); x.arc(170, 463, 46, 0, 7); x.fill();
      x.fillStyle = '#fbbf24'; x.beginPath(); x.moveTo(156, 438); x.lineTo(156, 488); x.lineTo(196, 463); x.closePath(); x.fill();
      x.fillStyle = '#0f172a'; x.font = `600 70px ${F}`; x.textBaseline = 'middle'; x.fillText('เข้าสู่บทเรียน', 250, 468); x.textBaseline = 'alphabetic';
    }));
    const days = this.daysLeft(Date.now());
    this.tx('cal', this.cv(512, 460, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#f43f5e'; x.fillRect(0, 0, w, 112);
      x.fillStyle = '#fff'; x.textAlign = 'center'; { const ttl = (this.props.countdown && this.props.countdown.title) || 'นับถอยหลังสู่วันสอบ'; let fz = 38; x.font = `600 ${fz}px ${F}`; while (fz > 20 && x.measureText(ttl).width > w - 40) { fz -= 2; x.font = `600 ${fz}px ${F}`; } x.fillText(ttl, w / 2, 72); }
      x.fillStyle = '#0f172a'; x.font = `600 200px ${F}`; x.fillText(String(days), w / 2, 330);
      x.fillStyle = '#64748b'; x.font = `600 40px ${B}`; x.fillText('วัน', w / 2, 400);
    }));
    const lined = (x, w, h) => { x.fillStyle = '#fffdf7'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(56,189,248,.35)'; x.lineWidth = 2; for (let y = 120; y < h; y += 46) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } };
    const hw = "'Itim', cursive", ink = '#1d4ed8';
    this.tx('noteL', this.cv(512, 700, (x, w, h) => {
      lined(x, w, h); x.strokeStyle = 'rgba(244,63,94,.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(62, 0); x.lineTo(62, h); x.stroke();
      x.fillStyle = '#0f766e'; x.font = `600 50px ${F}`; x.fillText('สรุป บทที่ 3', 82, 78);
      x.strokeStyle = '#f59e0b'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); for (let px = 0; px <= 300; px += 10) x.lineTo(84 + px, 96 + Math.sin(px * .12) * 3); x.stroke();
      x.fillStyle = '#475569'; x.font = `30px ${hw}`; x.fillText('บทที่ 3 · สมการเชิงเส้น', 82, 158);
      x.fillStyle = ink; x.font = `36px ${hw}`;
      x.fillText('2x + 5 = 17', 92, 250); x.fillText('2x = 17 − 5', 92, 296); x.fillText('2x = 12', 92, 342); x.fillText('x = 6', 92, 388);
      x.strokeStyle = '#ef4444'; x.lineWidth = 4; x.beginPath(); x.ellipse(135, 376, 62, 30, -0.05, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(215, 378); x.lineTo(232, 396); x.lineTo(266, 352); x.stroke();
      x.fillStyle = 'rgba(253,224,71,.55)'; x.fillRect(84, 440, 360, 40);
      x.fillStyle = '#92400e'; x.font = `30px ${hw}`; x.fillText('ย้ายข้าง = เปลี่ยนเครื่องหมาย', 92, 470);
      x.fillStyle = '#475569'; x.font = `30px ${hw}`; x.fillText('ลองทำ: 3x − 4 = 11', 92, 572);
      x.strokeStyle = 'rgba(29,78,216,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(92, 620); for (let px = 0; px <= 200; px += 12) x.lineTo(92 + px, 620 + Math.sin(px * .3) * 4); x.stroke();
    }));
    this.tx('noteR', this.cv(512, 700, (x, w, h) => {
      lined(x, w, h);
      x.fillStyle = '#0f766e'; x.font = `40px ${hw}`; x.fillText('ฝึกคิดเลข', 40, 78);
      const frac = (cx, y, n, d) => { x.textAlign = 'center'; x.fillText(n, cx, y - 8); x.fillRect(cx - 20, y, 40, 3); x.fillText(d, cx, y + 36); x.textAlign = 'left'; };
      x.fillStyle = ink; x.font = `34px ${hw}`;
      frac(64, 170, '1', '2'); x.fillText('+', 96, 182); frac(146, 170, '1', '3'); x.fillText('=', 178, 182); frac(228, 170, '3', '6'); x.fillText('+', 260, 182); frac(310, 170, '2', '6'); x.fillText('=', 342, 182);
      x.fillStyle = '#ef4444'; frac(392, 170, '5', '6');
      x.fillStyle = ink; x.font = `36px ${hw}`; x.textAlign = 'right';
      x.fillText('24', 170, 300); x.fillText('× 13', 170, 346); x.fillRect(80, 360, 96, 3);
      x.fillText('72', 170, 400); x.fillText('240', 170, 446); x.fillRect(80, 460, 96, 3);
      x.fillStyle = '#ef4444'; x.fillText('312', 170, 504); x.textAlign = 'left';
      x.strokeStyle = '#334155'; x.lineWidth = 3; x.beginPath(); x.moveTo(250, 520); x.lineTo(470, 520); x.moveTo(280, 540); x.lineTo(280, 290); x.stroke();
      x.strokeStyle = '#14b8a6'; x.lineWidth = 5; x.beginPath(); x.moveTo(270, 500); x.lineTo(450, 320); x.stroke();
      x.fillStyle = '#0f766e'; x.font = `28px ${hw}`; x.fillText('y = x + 1', 340, 300);
      x.save(); x.translate(300, 610); x.rotate(-0.04); x.fillStyle = '#fbbf24'; x.fillRect(-10, -36, 200, 64); x.fillStyle = '#0f172a'; x.font = `600 30px ${F}`; x.fillText('จำให้ขึ้นใจ!', 10, 8); x.restore();
    }));
    this.tx('cardSum', this.cv(600, 400, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#14b8a6'; x.fillRect(0, 0, w, 70);
      x.fillStyle = '#fff'; x.font = `600 40px ${F}`; x.fillText('สรุปเนื้อหา', 40, 50);
      x.fillStyle = '#0f172a'; x.font = `500 54px ${F}`; x.fillText('A = πr²', 40, 160);
      x.fillStyle = 'rgba(15,23,42,.18)'; [380, 300, 340].forEach((l, i) => { rr(x, 40, 210 + i * 50, l, 14, 7); x.fill(); });
      x.fillStyle = '#f59e0b'; x.beginPath(); x.arc(520, 150, 40, 0, 7); x.fill();
    }));
    this.tx('exam', this.cv(512, 660, (x, w, h) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#0f172a'; x.font = `600 52px ${F}`; x.fillText('ข้อสอบ', 40, 80);
      x.fillStyle = '#94a3b8'; x.font = `500 24px ${B}`; x.fillText('ชื่อ ____________  คะแนน ____', 40, 124);
      for (let q = 0; q < 4; q++) {
        const y = 190 + q * 116; x.fillStyle = '#0f172a'; x.font = `600 28px ${B}`; x.fillText((q + 1) + '.', 40, y);
        x.fillStyle = 'rgba(15,23,42,.16)'; rr(x, 84, y - 20, 330 - q * 30, 12, 6); x.fill();
        ['ก', 'ข', 'ค', 'ง'].forEach((c, i) => { const cx = 100 + i * 96, cy = y + 42; x.strokeStyle = '#cbd5e1'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 20, 0, 7); x.stroke(); if (i === (q * 3 + 1) % 4) { x.fillStyle = '#14b8a6'; x.beginPath(); x.arc(cx, cy, 20, 0, 7); x.fill(); } x.fillStyle = i === (q * 3 + 1) % 4 ? '#fff' : '#64748b'; x.font = `600 20px ${B}`; x.textAlign = 'center'; x.fillText(c, cx, cy + 7); x.textAlign = 'left'; });
      }
      x.strokeStyle = '#ef4444'; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); x.moveTo(400, 60); x.lineTo(425, 90); x.lineTo(470, 30); x.stroke();
    }));
    this.tx('sticky', this.cv(512, 512, (x, w, h) => {
      x.clearRect(0, 0, w, h); x.textAlign = 'center';
      x.fillStyle = '#f59e0b'; x.font = `600 64px ${B}`; x.fillText('★★★★★', w / 2, 150);
      x.fillStyle = '#0f172a'; x.font = `600 76px ${F}`; x.fillText('เข้าใจง่าย', w / 2, 290);
      x.fillStyle = '#475569'; x.font = `500 52px ${F}`; x.fillText('สนุกมาก!', w / 2, 380);
    }));
    this.tx('cover', this.cv(1024, 728, (x, w, h) => {
      x.clearRect(0, 0, w, h); const L = 170;
      x.strokeStyle = 'rgba(136,19,55,.35)'; x.lineWidth = 3; rr(x, L - 40, 44, w - L + 10, h - 88, 22); x.stroke();
      x.fillStyle = '#9f1239'; x.font = `700 24px ${B}`; x.letterSpacing = '9px'; x.fillText('KRUHEEM · MATH SCHOOL', L, 100); x.letterSpacing = '0px';
      x.fillStyle = '#0f766e'; x.beginPath(); x.arc(w - 120, 250, 62, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.font = `600 80px ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('π', w - 120, 246); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#881337'; x.font = `600 196px ${F}`; x.fillText('คณิต', L - 10, 342);
      x.fillStyle = '#0f766e'; x.font = `600 132px ${F}`; x.fillText('ครูฮีม', L - 4, 524);
      x.strokeStyle = 'rgba(136,19,55,.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(L, 598); x.lineTo(w - 90, 598); x.stroke();
      x.fillStyle = '#881337'; x.font = `600 30px ${B}`; x.fillText('สอนเทคนิคคิดลัด เข้าใจง่าย', L, 646);
    }));
    this.tx('letter', this.cv(600, 780, (x, w, h) => {
      x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(148,163,184,.35)'; x.lineWidth = 2; for (let y = 170; y < h - 40; y += 58) { x.beginPath(); x.moveTo(50, y); x.lineTo(w - 50, y); x.stroke(); }
      const H = "'Itim', cursive";
      x.fillStyle = '#0f172a'; x.font = `56px ${H}`; x.fillText('ถึง ครูฮีม', 60, 120);
      x.fillStyle = '#334155'; x.font = `40px ${H}`; x.fillText('ขอบคุณครูมากค่ะ', 60, 222); x.fillText('ลูกเข้าใจเลขมากขึ้น', 60, 280);
      x.strokeStyle = 'rgba(51,65,85,.4)'; x.lineWidth = 4; x.lineCap = 'round';
      [[60, 420], [60, 380], [60, 440], [60, 300]].forEach(([sx, len], i) => { const y = 330 + i * 58; x.beginPath(); x.moveTo(sx, y); for (let px = 0; px <= len; px += 14) x.lineTo(sx + px, y + Math.sin(px * .25 + i) * 5); x.stroke(); });
      x.fillStyle = '#0f766e'; x.font = `44px ${H}`; x.textAlign = 'right'; x.fillText('แม่น้องภูมิ', w - 60, 690); x.textAlign = 'left';
      x.fillStyle = '#f43f5e'; x.beginPath(); const hx = w - 110, hy = 600; x.moveTo(hx, hy + 18); x.bezierCurveTo(hx - 40, hy - 10, hx - 18, hy - 40, hx, hy - 18); x.bezierCurveTo(hx + 18, hy - 40, hx + 40, hy - 10, hx, hy + 18); x.fill();
    }));
    this.BOOK_CATS.concat(['คอร์สทั้งหมด']).forEach((title, i) => this.tx('sp' + i, this.cv(1024, 150, (x, w, h) => {
      x.fillStyle = i === this.BOOK_CATS.length ? this.SPINE[this.SPINE.length - 1] : this.SPINE[i % this.SPINE.length]; x.fillRect(0, 0, w, h); // [พอร์ต] เล่มบนสีเดิมเสมอ
      x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(0, 16, w, 5); x.fillRect(0, h - 21, w, 5);
      x.fillStyle = '#fff'; { let fz = 68; x.font = `600 ${fz}px ${F}`; while (fz > 36 && x.measureText(title).width > w - 260) { fz -= 2; x.font = `600 ${fz}px ${F}`; } } x.textBaseline = 'middle'; x.fillText(title, 56, h / 2 + 4);
      x.globalAlpha = .75; x.font = `700 28px ${B}`; x.textAlign = 'right'; x.fillText('KruHeem', w - 48, h / 2 + 2); x.globalAlpha = 1;
    })));
    this.REVIEWS.forEach((r, i) => this.tx('pi' + i, this.cv(384, 384, (x, w, h) => {
      x.fillStyle = r.kid ? '#fcd34d' : '#f9a8d4'; x.fillRect(0, 0, w, h);
      const g = x.createLinearGradient(0, h * .7, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = r.kid ? '#b45309' : '#be185d'; x.font = `700 30px ${B}`; x.fillText('★'.repeat(Math.max(1, Math.min(5, r.stars || 5))), 30, 64);
      x.fillStyle = '#0f172a'; x.font = "54px 'Itim', cursive";
      const segs = (window.Intl && Intl.Segmenter) ? Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(r.q), s => s.segment) : r.q.split(/(\s+)/);
      for (let k = segs.length - 1; k > 0; k--) if (/^[…!?]+$/.test(segs[k])) { segs[k - 1] += segs[k]; segs.splice(k, 1); } // [พอร์ต] ไม่ให้ … ตกบรรทัดเดี่ยว
      let lines = [], s = ''; segs.forEach(sg => { if (s && x.measureText(s + sg).width > w - 60) { lines.push(s); s = sg.trimStart(); } else s += sg; }); lines.push(s);
      if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] = lines[2].trim() + '…'; } lines.forEach((l, j) => x.fillText(l.trim(), 30, 150 + j * 64));
      x.fillStyle = r.kid ? '#b45309' : '#be185d'; x.font = "38px 'Itim', cursive"; x.fillText('— ' + (r.nShort || r.n), 30, h - 40);
    })));
    this.tx('tipsCover', this.cv(640, 470, (x, w, hh) => {
      x.fillStyle = '#1e293b'; x.fillRect(0, 0, w, hh);
      x.fillStyle = '#f8fafc'; x.font = `600 92px ${F}`; x.fillText('เทคนิค', 70, 196); x.fillText('การเรียน', 70, 304);
      x.fillStyle = '#fbbf24'; x.fillRect(74, 336, 64, 6);
      x.fillStyle = '#94a3b8'; x.font = `600 28px ${B}`; x.fillText('โดย ครูฮีม', 74, 392);
    }));
    this.makePhoneTex();
    if (!this.avatarImg && !this._avLoading) { this._avLoading = true; const av = new Image(); av.onload = () => { this.avatarImg = av; this.makePhoneTex(); }; av.src = '/assets/kruheem_avatar.png'; }
    this.tx('glow', this.cv(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }));
    this.tx('blob', this.cv(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(60,45,20,.28)'); g.addColorStop(1, 'rgba(60,45,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }));
  }

  woodTex(name, w, h, plank) {
    this.tx(name, this.cv(w, h, (x) => {
      x.fillStyle = '#ddd2c4'; x.fillRect(0, 0, w, h);
      let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 260; i++) { const y = rnd() * h, a = .04 + rnd() * .1; x.strokeStyle = 'rgba(70,40,20,' + a + ')'; x.lineWidth = 1 + rnd() * 3; x.beginPath(); x.moveTo(0, y); for (let px = 0; px <= w; px += 40) x.lineTo(px, y + Math.sin(px * .01 + i) * 4 + (rnd() - .5) * 2); x.stroke(); }
      for (let i = 0; i < 6; i++) { const cx = rnd() * w, cy = rnd() * h; x.strokeStyle = 'rgba(70,40,20,.12)'; x.lineWidth = 2; for (let r = 4; r < 22; r += 5) { x.beginPath(); x.ellipse(cx, cy, r * 2.6, r, 0, 0, 7); x.stroke(); } }
      if (plank) { x.strokeStyle = 'rgba(40,22,10,.35)'; x.lineWidth = 3; for (let y = 0; y <= h; y += h / 6) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } }
    }));
    const t = this.tex[name]; t.wrapS = t.wrapT = this.T.RepeatWrapping; return t;
  }
  buildRoom() {
    const T = this.T, S = this.scene; this.ZW = -5.2; this.FY = -7.2;
    this.wallMat = new T.MeshStandardMaterial({ color: this.props.bgColor || '#164a45', roughness: 1, envMapIntensity: .08 });
    const wall = new T.Mesh(new T.PlaneGeometry(120, 60), this.wallMat); wall.position.set(0, 15, this.ZW); wall.receiveShadow = true; S.add(wall);
    this.tx('floorTile', this.cv(512, 512, (x, w, h) => {
      x.fillStyle = '#cfd6de'; x.fillRect(0, 0, w, h);
      let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 1400; i++) { x.fillStyle = 'rgba(71,85,105,' + (rnd() * .06) + ')'; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
      x.strokeStyle = 'rgba(71,85,105,.22)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
    }));
    const ft = this.tex.floorTile; ft.wrapS = ft.wrapT = T.RepeatWrapping; ft.repeat.set(30, 15);
    this.floorMat = new T.MeshStandardMaterial({ color: this.props.floorColor || '#b9c3cf', map: ft, roughness: .55, envMapIntensity: .3 });
    const floor = new T.Mesh(new T.PlaneGeometry(120, 60), this.floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, this.FY, 25 + this.ZW); floor.receiveShadow = true; S.add(floor);
    this.tx('rug', this.cv(1024, 1024, (x, w, h) => {
      x.clearRect(0, 0, w, h); const c = w / 2;
      [['#f4efe4', 508], ['#0f766e', 470], ['#f4efe4', 452], ['#f59e0b', 330], ['#f4efe4', 316]].forEach(([col, r]) => { x.fillStyle = col; x.beginPath(); x.arc(c, c, r, 0, 7); x.fill(); });
      x.fillStyle = 'rgba(15,118,110,.14)'; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.beginPath(); x.arc(c + Math.cos(a) * 390, c + Math.sin(a) * 390, 16, 0, 7); x.fill(); }
    }));
    const rug = new T.Mesh(new T.CircleGeometry(9.5, 96), new T.MeshStandardMaterial({ map: this.tex.rug, transparent: true, roughness: .95, envMapIntensity: .1, polygonOffset: true, polygonOffsetFactor: -1 }));
    rug.rotation.x = -Math.PI / 2; rug.scale.set(1.25, 0.72, 1); rug.position.set(0, this.FY + 0.01, 1.5); rug.receiveShadow = true; S.add(rug);
    const sk = new T.Mesh(new T.BoxGeometry(120, 0.6, 0.12), this.M(0xf5efe6, { r: .6 })); sk.position.set(0, this.FY + 0.3, this.ZW + 0.06); S.add(sk);
    this.tx('sky', this.cv(512, 640, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7cc4ea'); g.addColorStop(.7, '#cdeaf5'); g.addColorStop(1, '#f4f1e4'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.85)'; [[120, 150, 60], [190, 140, 46], [60, 170, 40], [380, 300, 52], [440, 290, 38]].forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); });
      x.fillStyle = '#9fcf9a'; x.beginPath(); x.moveTo(0, h); for (let px = 0; px <= w; px += 16) x.lineTo(px, h - 90 - Math.sin(px * .03) * 26 - Math.sin(px * .011) * 30); x.lineTo(w, h); x.fill();
      x.fillStyle = '#6fae78'; x.beginPath(); x.moveTo(0, h); for (let px = 0; px <= w; px += 16) x.lineTo(px, h - 40 - Math.sin(px * .05 + 1) * 16); x.lineTo(w, h); x.fill();
    }));
    this.skyMat = new T.MeshBasicMaterial({ map: this.tex.sky, toneMapped: false });
    this.win = new T.Group(); S.add(this.win);
    this.clock = new T.Group(); S.add(this.clock);
    this.tx('clockFace', this.cv(512, 512, (x, w) => {
      x.fillStyle = '#fffdf8'; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0; x.strokeStyle = big ? '#0f172a' : '#94a3b8'; x.lineWidth = big ? 8 : 3; x.beginPath(); x.moveTo(256 + Math.sin(a) * (big ? 200 : 214), 256 - Math.cos(a) * (big ? 200 : 214)); x.lineTo(256 + Math.sin(a) * 232, 256 - Math.cos(a) * 232); x.stroke(); }
      x.fillStyle = '#0f172a'; x.font = "600 54px 'Mitr', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
      [['12', 0], ['3', 90], ['6', 180], ['9', 270]].forEach(([s, d]) => { const a = d * Math.PI / 180; x.fillText(s, 256 + Math.sin(a) * 160, 256 - Math.cos(a) * 160); });
      x.fillStyle = '#0d9488'; x.font = "700 26px 'IBM Plex Sans Thai Looped', sans-serif"; x.fillText('KruHeem', 256, 330);
    }));
  }
  boardTex(aspect, qp) {
    const W = 1024, H = Math.max(200, Math.round(1024 / aspect)); this._boardAspect = aspect;
    const day = Math.floor((Date.now() + 7 * 3600e3) / 86400000), quote = this.QUOTES[day % this.QUOTES.length], prog = qp === undefined ? 1 : qp;
    this.tx('board', this.cv(W, H, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#26403c'); g.addColorStop(1, '#1b2e2b'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,' + (.012 + rnd() * .02) + ')'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 40 + rnd() * 160, 10 + rnd() * 40, rnd() * 3, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.16)'; x.font = "500 34px 'Mitr', sans-serif";
      const zf = this._zoneFrac || 0.25; x.textAlign = 'center'; x.font = "500 " + Math.round(Math.min(34, w * zf * 0.14)) + "px 'Mitr', sans-serif"; x.fillText('π ≈ 3.14', w * zf / 2, h - 26);
      x.fillText('a² + b² = c²', w - w * zf / 2, h - 26);
      if (this._qFrac) { const qy = h - this._qFrac * h * 0.5, fs = Math.max(18, Math.min(40, this._qFrac * h * 0.42)); x.font = fs + "px 'Itim', cursive"; x.textAlign = 'center'; const full = '“' + quote + '”', tw = x.measureText(full).width;
        x.save(); x.beginPath(); x.rect(w / 2 - tw / 2 - 6, qy - fs, (tw + 12) * prog, fs * 1.6); x.clip(); x.fillStyle = 'rgba(253,230,138,.95)'; x.fillText(full, w / 2, qy + fs * 0.35); x.restore();
        x.fillStyle = 'rgba(255,255,255,.35)'; x.font = "600 " + Math.round(fs * 0.45) + "px 'IBM Plex Sans Thai Looped', sans-serif"; if (prog >= 1) x.fillText('คำคมประจำวัน', w / 2, qy - fs * 1.05);
        if (prog < 1) { const px = w / 2 - tw / 2 + tw * prog; x.fillStyle = '#fff'; x.beginPath(); x.arc(px, qy + 4, 5, 0, 7); x.fill(); } }
      
    }));
    const t = this.tex.board; t.needsUpdate = true; return t;
  }
  placeRoom(pose) {
    const T = this.T, hr = this.heroRef.current; if (!hr || !this.wallMat) return;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const ch of hr.children) { const q = ch.getBoundingClientRect(); if (q.width < 4 || q.height < 4) continue; x0 = Math.min(x0, q.left); x1 = Math.max(x1, q.right); y0 = Math.min(y0, q.top); y1 = Math.max(y1, q.bottom); }
    if (x0 > x1) return;
    x0 -= 44; x1 += 44; y0 -= 24; y1 += 22;
    const c = this._pc || (this._pc = new T.PerspectiveCamera());
    c.fov = this.cam.fov; c.aspect = innerWidth / innerHeight; c.near = .1; c.far = 200;
    c.position.copy(pose.p); c.lookAt(pose.t); c.setViewOffset(innerWidth, innerHeight, 0, -(pose.s || 0), innerWidth, innerHeight); c.updateProjectionMatrix(); c.updateMatrixWorld();
    const ZB = this.ZW + 0.14, pl = new T.Plane(new T.Vector3(0, 0, 1), -ZB), rc = this._rc || (this._rc = new T.Raycaster());
    const hit = (sx, sy) => { rc.setFromCamera(new T.Vector2(sx / innerWidth * 2 - 1, -(sy / innerHeight * 2 - 1)), c); const p = new T.Vector3(); rc.ray.intersectPlane(pl, p); return p; };
    const a = hit(x0, y0), b = hit(x1, y1);
    const bh = Math.max(1, a.y - b.y), ps = Math.min(1.1, Math.max(0.62, (bh - 0.3) / 2.3)), sz0 = 1.02 * ps, gx = 0.2 * ps, ext = 3 * sz0 + 2 * gx + 0.5, hw = Math.max(2, b.x - a.x), bw = hw + ext * 2, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const key = bw.toFixed(2) + 'x' + bh.toFixed(2) + '@' + cx.toFixed(2) + ',' + cy.toFixed(2);
    if (key === this._roomKey) return; this._roomKey = key;
    // [พอร์ต] ต้นแบบถอดของเก่าออกเฉยๆ → geometry ค้างในการ์ดจอทุกครั้งที่ย่อ/ขยาย/หมุนจอ
    const shared = new Set(Object.values(this.mats || {}).concat([this.skyMat]));
    const drop = (o) => o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material && !Array.isArray(n.material) && !shared.has(n.material)) n.material.dispose(); });
    if (this.board) { drop(this.board); this.scene.remove(this.board); }
    const B = this.board = new T.Group(); B.position.set(cx, cy, ZB); this.scene.add(B);
    const fr = this.rbox(bw + 0.4, 0.2, bh + 0.4, 0.08, this.M(0xc9a27a, { r: .6 })); fr.rotation.x = Math.PI / 2; B.add(fr);
    this._qFrac = 0; this.quoteP = 1; this._zoneFrac = ext / bw;
    const surf = new T.Mesh(new T.PlaneGeometry(bw, bh), new T.MeshStandardMaterial({ map: this.boardTex(bw / bh, this.quoteP), roughness: .95, envMapIntensity: .2 }));
    surf.position.z = 0.105; surf.receiveShadow = true; B.add(surf);
    const tray = this.rbox(bw * 0.86, 0.1, 0.34, 0.04, this.M(0xc9a27a, { r: .6 })); tray.position.set(0, -bh / 2 - 0.2, 0.26); B.add(tray);
    this.placeTrayProps(new T.Vector3(cx, cy - bh / 2 - 0.2 + 0.05, ZB + 0.26), bw * 0.86);
    const notes = [], hits = [], tilt = [-0.06, 0.05, -0.03, 0.04, -0.05, 0.06];
    const gcx = bw / 2 - ext / 2 - 0.05, gy = sz0 / 2 + gx * 0.9;
    [0, 1].forEach((row) => {
      [0, 1, 2].forEach((col) => {
        const idx = row * 3 + col; if (!this.tex['pi' + idx]) return; // [พอร์ต] รีวิวจริงไม่ถึง 6 ใบ → ไม่ติดโพสต์อิทเปล่า
        const ng = new T.Group(); ng.position.set(gcx + (col - 1) * (sz0 + gx) + (row ? 0.08 : -0.06) * ps, (row ? -gy : gy) + (col === 1 ? 0.05 : 0) * ps, 0.12); ng.rotation.z = tilt[idx];
        const sz = sz0, pm = new T.Mesh(new T.PlaneGeometry(sz, sz), new T.MeshStandardMaterial({ map: this.tex['pi' + idx], roughness: .85 }));
        pm.castShadow = true; ng.add(pm);
        const tack = this.mesh(new T.SphereGeometry(0.055 * ps + 0.02, 16, 12), this.M(idx % 2 ? 0x0f766e : 0xef4444, { r: .3 })); tack.position.set(0, sz / 2 - 0.1, 0.05); ng.add(tack);
        B.add(ng); notes.push({ g: ng, rz: ng.rotation.z });
        ng.traverse(m => { if (m.isMesh) m.userData.key = 'reviews'; });
      });
    });
    this.promoRib = null;
    const lbl = this.tx('fbLbl', this.cv(512, 80, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.fillStyle = 'rgba(255,255,255,.55)'; x.font = "600 44px 'Mitr', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ผลตอบรับ', w / 2, hh / 2); }));
    const lbw = Math.min(ext - 0.6, 1.9), lb = new T.Mesh(new T.PlaneGeometry(lbw, lbw * 80 / 512), new T.MeshBasicMaterial({ map: this.tex.fbLbl, transparent: true, depthWrite: false })); lb.position.set(gcx, Math.min(bh / 2 - 0.16, gy + sz0 / 2 + 0.2), 0.11); B.add(lb); this._fbLabel = lb;
    const sep = new T.Mesh(new T.PlaneGeometry(0.02, bh * 0.78), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 })); sep.position.set(gcx - ext / 2 + 0.05, 0, 0.11); B.add(sep);
    if (this.kru) { const s = Math.min(ext * 0.62, bh * 0.8 / 1.36); this.kru.g.scale.setScalar(s); this.kru.g.position.set(cx - bw / 2 + ext / 2 + 0.05, cy + 0.04, ZB + 0.12); }
    { const cw = 3 * sz0 + 2 * gx + 0.5, ch = Math.min(bh - 0.1, 2 * sz0 + gx * 2 + 0.9), hp = new T.Mesh(new T.PlaneGeometry(cw, ch), new T.MeshBasicMaterial({ visible: false }));
      hp.position.set(gcx, (gy + sz0 / 2 + 0.3 - (gy + sz0 / 2 + 0.1)) / 2, 0.14); hp.userData.key = 'reviews'; B.add(hp); hits.push(hp); }
    this.boardHits = hits;
    let it = this.items.reviews;
    if (!it) { it = { k: 'reviews', static: true, h: 0, v: 0, rotY: 0, fd: 1, rs: 0.001 }; this.items.reviews = it; this.order.push(it); }
    it.g = B; it.x = cx + bw / 2 - ext / 2; it.ay = cy + 0.75 * ps + 0.2; it.z = ZB + 0.2;
    it.anim = (hv, t) => notes.forEach((n, i) => { n.g.position.z = 0.12 + hv * 0.3; n.g.rotation.x = -hv * 0.16; n.g.rotation.z = n.rz + Math.sin(t * 2.2 + i) * 0.03 * hv; });
    delete it.focus;
    it.boxFn = () => { const b = new T.Box3(); notes.forEach(n => { n.g.updateMatrixWorld(true); b.expandByObject(n.g); }); if (this._fbLabel) { this._fbLabel.updateMatrixWorld(true); b.expandByObject(this._fbLabel); } return b; };
    it.dir = new T.Vector3(0, 0.12, 1).normalize();
    const gap = Math.max(0.9, bh * 0.25);
    this.win.children.forEach(drop); this.win.clear(); const wh = Math.min(bh * 1.25, 7), ww = wh * 0.82;
    this.win.position.set(cx - bw / 2 - gap - ww / 2, cy + 0.2, this.ZW + 0.08);
    const wf = this.rbox(ww + 0.36, 0.26, wh + 0.36, 0.06, this.M(0xfaf7f0, { r: .5 })); wf.rotation.x = Math.PI / 2; this.win.add(wf);
    const glass = new T.Mesh(new T.PlaneGeometry(ww, wh), this.skyMat); glass.position.z = 0.135; this.win.add(glass);
    const mm = this.M(0xfaf7f0, { r: .5 });
    const mv = this.mesh(new T.BoxGeometry(0.1, wh, 0.12), mm); mv.position.z = 0.16; this.win.add(mv);
    const mh = this.mesh(new T.BoxGeometry(ww, 0.1, 0.12), mm); mh.position.set(0, wh * 0.12, 0.16); this.win.add(mh);
    const sill = this.rbox(ww + 0.8, 0.14, 0.6, 0.05, mm); sill.position.set(0, -wh / 2 - 0.25, 0.3); this.win.add(sill);
    const pot = this.mesh(new T.CylinderGeometry(0.28, 0.22, 0.5, 24), this.M(0xe07a5f, { r: .7 })); pot.position.set(-ww * 0.3, -wh / 2 - 0.18 + 0.25 + 0.07, 0.35); this.win.add(pot);
    for (let i = 0; i < 5; i++) { const lf = this.mesh(new T.SphereGeometry(0.2, 12, 10), this.M(i % 2 ? 0x5cb883 : 0x3f9d6b, { r: .6 })); lf.scale.set(.7, 1.5, .5); lf.position.set(-ww * 0.3 + Math.sin(i * 1.3) * 0.18, pot.position.y + 0.5 + (i % 3) * 0.14, 0.35 + Math.cos(i * 1.3) * 0.08); lf.rotation.z = Math.sin(i * 1.3) * 0.5; this.win.add(lf); }
    mv.visible = false; mh.visible = false; this._winW = ww; this._winH = wh;

    this.roomHits = [];
    const sashM = this.M(0xfaf7f0, { r: .5 }), glassM = new T.MeshStandardMaterial({ color: 0xdbeafe, roughness: .05, transparent: true, opacity: .16, side: T.DoubleSide, depthWrite: false });
    this.sashes = [-1, 1].map(sd => {
      const pv = new T.Group(); pv.position.set(sd * ww / 2, 0, 0.17); this.win.add(pv);
      const pw = ww / 2, cx = -sd * pw / 2, th = 0.09;
      [[cx, wh / 2 - th / 2, pw, th], [cx, -wh / 2 + th / 2, pw, th], [cx - pw / 2 + th / 2, 0, th, wh], [cx + pw / 2 - th / 2, 0, th, wh], [cx, 0, pw, 0.06]].forEach(([x, y, w, hh]) => { const b = this.mesh(new T.BoxGeometry(w, hh, 0.08), sashM); b.position.set(x, y, 0); pv.add(b); b.userData.key = 'window'; this.roomHits.push(b); });
      const gl = new T.Mesh(new T.PlaneGeometry(pw - 0.1, wh - 0.1), glassM); gl.position.set(cx, 0, 0); pv.add(gl); gl.userData.key = 'window'; this.roomHits.push(gl);
      const knob = this.mesh(new T.SphereGeometry(0.05, 12, 10), this.M(0xd6d3d1, { r: .2, m: .8 })); knob.position.set(cx + sd * (pw / 2 - 0.16), 0, 0.07); pv.add(knob);
      return pv;
    });
    glass.userData.key = 'window'; this.roomHits.push(glass);
    const rod = this.mesh(new T.CylinderGeometry(0.035, 0.035, ww + 2.2, 12), this.M(0x7c5334, { r: .5 })); rod.rotation.z = Math.PI / 2; rod.position.set(0, wh / 2 + 0.42, 0.55); this.win.add(rod);
    this.curtains = [-1, 1].map(sd => {
      const cw = 1.0, ch = wh + 0.9, geo = new T.PlaneGeometry(cw, ch, 10, 18), arr = geo.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) arr[i + 2] = Math.sin(arr[i] * 13 + sd) * 0.06;
      const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xf4efe4, roughness: .95, side: T.DoubleSide })); m.castShadow = true;
      m.position.set(sd * (ww / 2 + 0.55), wh / 2 + 0.42 - ch / 2, 0.52); this.win.add(m);
      return { m, base: Float32Array.from(geo.attributes.position.array), H: ch, side: sd, ph: sd * 1.7 };
    });
    this.clock.children.forEach(drop); this.clock.clear(); const cr = Math.min(1.25, bh * 0.3);
    this.clock.position.set(cx + bw / 2 + gap + cr + 0.2, cy + 0.2, this.ZW + 0.08);
    const rim = this.mesh(new T.CylinderGeometry(cr + 0.1, cr + 0.1, 0.18, 64), this.M(0x1e293b, { r: .35, m: .3 })); rim.rotation.x = Math.PI / 2; this.clock.add(rim);
    const face = new T.Mesh(new T.CircleGeometry(cr, 64), new T.MeshStandardMaterial({ map: this.tex.clockFace, roughness: .6 })); face.position.z = 0.1; this.clock.add(face);
    const hand = (len, wd, col, z) => { const pv = new T.Group(); pv.position.z = z; const m = this.mesh(new T.BoxGeometry(wd, len, 0.03), this.M(col, { r: .4 })); m.position.y = len / 2 - len * 0.12; pv.add(m); this.clock.add(pv); return pv; };
    this.hH = hand(cr * 0.5, 0.07, 0x0f172a, 0.12); this.hM = hand(cr * 0.75, 0.05, 0x0f172a, 0.14); this.hS = hand(cr * 0.82, 0.02, 0xf43f5e, 0.16);
    const pin = this.mesh(new T.CylinderGeometry(0.06, 0.06, 0.06, 16), this.M(0xf43f5e)); pin.rotation.x = Math.PI / 2; pin.position.z = 0.18; this.clock.add(pin);
    this.hideWall(); // [พอร์ต] มือถือแนวตั้งไม่โชว์ของบนผนัง
  }
  buildDesk() {
    const T = this.T, tone = this.props.deskTone || '#74472a', wt = this.woodTex('deskWood', 1024, 512, false); wt.repeat.set(0.085, 0.16);
    this.deskMat = new T.MeshStandardMaterial({ color: tone, map: wt, roughness: .55, envMapIntensity: .4 });
    this.deskMat2 = new T.MeshStandardMaterial({ color: this.mix(tone, '#000000', .18), map: wt, roughness: .6, envMapIntensity: .35 });
    const S = this.scene, FY = this.FY, add = (m) => { S.add(m); return m; };
    const top = add(this.rbox(12.6, 0.42, 7.6, 0.24, this.deskMat)); top.position.y = -0.21; top.castShadow = false;
    const apronH = 1.1, apY = -0.42 - apronH / 2;
    const ap = add(this.rbox(12.0, apronH, 7.0, 0.04, this.deskMat2)); ap.position.y = apY;
    const pedTop = -0.42 - apronH, pedH = pedTop - FY, pedX = 4.25;
    const ped = add(this.rbox(3.5, pedH, 7.0, 0.05, this.deskMat2)); ped.position.set(pedX, pedTop - pedH / 2, 0);
    const metal = this.M(0xd6d3d1, { r: .25, m: .8 });
    const handle = (parent, w, y, z) => { const hd = this.mesh(new T.CapsuleGeometry(0.05, w, 4, 12), metal); hd.rotation.z = Math.PI / 2; hd.position.set(0, y, z); parent.add(hd); };
    for (let i = 0; i < 3; i++) {
      const dh = (pedH - 0.5) / 3, y = pedTop - 0.2 - dh / 2 - i * (dh + 0.05);
      const f = add(this.rbox(3.2, dh - 0.12, 0.12, 0.05, this.deskMat)); f.position.set(pedX, y, 3.54);
      handle(f, 1.0, 0, 0.1);
    }
    [[-5.75, 3.05], [-5.75, -3.05]].forEach(([x, z]) => { const l = add(this.rbox(0.5, pedTop - FY, 0.5, 0.08, this.deskMat2)); l.position.set(x, pedTop - (pedTop - FY) / 2, z); });
    const bar = add(this.rbox(0.3, 0.3, 6.1, 0.05, this.deskMat2)); bar.position.set(-5.75, FY + 1.2, 0);
    const dg = new T.Group();
    const front = this.rbox(4.6, 0.82, 0.12, 0.05, this.deskMat); dg.add(front);
    const woodIn = this.M(0xd9c3a5, { r: .8 }), floorIn = this.M(0xefe3cf, { r: .9 });
    const flo = this.rbox(4.3, 0.05, 3.2, 0.02, floorIn); flo.position.set(0, -0.34, -1.66); dg.add(flo);
    [-2.13, 2.13].forEach(sx => { const s = this.rbox(0.05, 0.62, 3.2, 0.01, woodIn); s.position.set(sx, -0.03, -1.66); dg.add(s); });
    const bk = this.rbox(4.3, 0.62, 0.05, 0.01, woodIn); bk.position.set(0, -0.03, -3.25); dg.add(bk);
    const div = this.rbox(0.04, 0.4, 3.1, 0.01, woodIn); div.position.set(0.95, -0.12, -1.66); dg.add(div);
    handle(dg, 1.3, 0, 0.1);
    const Y0 = -0.31;
    const p1 = this.pencil(1.7); p1.position.set(-1.95, Y0 + 0.07, -1.25); p1.rotation.y = Math.PI / 2; dg.add(p1);
    const p2 = this.pencil(1.4); p2.position.set(-1.68, Y0 + 0.07, -1.2); p2.rotation.y = Math.PI / 2; p2.children[0].children[0].material = this.M(0x14b8a6, { r: .5 }); dg.add(p2);
    this.tx('ruler', this.cv(1024, 120, (x, w, hh) => { x.fillStyle = '#fde68a'; x.fillRect(0, 0, w, hh); x.fillStyle = '#78350f'; for (let i = 0; i <= 150; i++) { const X = 24 + i * (w - 48) / 150, L = i % 10 === 0 ? 46 : i % 5 === 0 ? 32 : 18; x.fillRect(X, 0, 2, L); if (i % 10 === 0) { x.font = "600 22px 'IBM Plex Sans Thai Looped', sans-serif"; x.textAlign = 'center'; x.fillText(String(i / 10), X, 76); } } x.font = "700 20px 'IBM Plex Sans Thai Looped', sans-serif"; x.textAlign = 'right'; x.fillText('KruHeem 15 cm', w - 30, 108); }));
    const rul = this.rbox(3.0, 0.03, 0.34, 0.02, this.M(0xfde68a, { r: .5 })); rul.position.set(-0.6, Y0 + 0.02, -2.75); rul.rotation.y = 0; this.decal(2.96, 0.32, 'ruler', rul, 0.016); dg.add(rul);
    const pen = new T.Group(); const pb = this.mesh(new T.CylinderGeometry(0.055, 0.05, 1.3, 20), this.M(0x1d4ed8, { r: .3, m: .2 })); pen.add(pb);
    const cap = this.mesh(new T.CylinderGeometry(0.062, 0.062, 0.42, 20), this.M(0x0f172a, { r: .3 })); cap.position.y = 0.66; pen.add(cap);
    const clp = this.mesh(new T.BoxGeometry(0.02, 0.34, 0.03), this.M(0xd6d3d1, { r: .2, m: .9 })); clp.position.set(0.07, 0.62, 0); pen.add(clp);
    const tipn = this.mesh(new T.ConeGeometry(0.05, 0.16, 16), this.M(0xd6d3d1, { r: .2, m: .9 })); tipn.position.y = -0.73; tipn.rotation.x = Math.PI; pen.add(tipn);
    const penW = new T.Group(); pen.rotation.z = Math.PI / 2; penW.add(pen); penW.position.set(-1.41, Y0 + 0.07, -1.2); penW.rotation.y = Math.PI / 2; dg.add(penW);
    const er = this.rbox(0.62, 0.18, 0.3, 0.05, this.M(0xfda4af, { r: .8 })); er.position.set(1.55, Y0 + 0.09, -0.8); er.rotation.y = 0.35; dg.add(er);
    const sl = this.rbox(0.44, 0.19, 0.32, 0.02, this.M(0x0ea5e9, { r: .4 })); sl.position.set(1.62, Y0 + 0.095, -0.8); sl.rotation.y = 0.35; dg.add(sl);
    const shp = this.rbox(0.36, 0.26, 0.3, 0.05, this.M(0xf43f5e, { r: .35, m: .1 })); shp.position.set(1.35, Y0 + 0.13, -1.55); dg.add(shp);
    const shh = this.mesh(new T.CylinderGeometry(0.07, 0.07, 0.06, 20), this.M(0x475569, { r: .3, m: .6 })); shh.rotation.x = Math.PI / 2; shh.position.set(1.35, Y0 + 0.15, -1.38); dg.add(shh);
    const prot = this.mesh(new T.RingGeometry(0.35, 0.62, 48, 1, 0, Math.PI), new T.MeshStandardMaterial({ color: 0x99f6e4, roughness: .15, transparent: true, opacity: .7, side: T.DoubleSide }));
    prot.rotation.x = -Math.PI / 2; prot.position.set(1.5, Y0 + 0.02, -2.15); dg.add(prot);
    for (let i = 0; i < 4; i++) { const pc = this.mesh(new T.TorusGeometry(0.1, 0.012, 6, 24), this.M([0xf59e0b, 0x14b8a6, 0xf43f5e, 0x6366f1][i], { r: .3, m: .4 })); pc.scale.set(1, 0.45, 1); pc.rotation.x = -Math.PI / 2; pc.rotation.z = i * 0.7; pc.position.set(1.1 + i * 0.16, Y0 + 0.012, -2.6 + (i % 2) * 0.12); dg.add(pc); }
    const pad = this.rbox(0.62, 0.08, 0.62, 0.02, this.M(0xfde68a, { r: .85 })); pad.position.set(0.55, Y0 + 0.04, -2.12); pad.rotation.y = 0.08; dg.add(pad);
    this.tx('drawerQuote', this.cv(640, 460, () => {}));
    const qc = this.rbox(1.5, 0.02, 1.08, 0.02, this.M(0xfef9c3, { r: .9 })); qc.position.set(-0.18, Y0 + 0.012, -1.2); qc.rotation.y = 0; dg.add(qc);
    this.decal(1.46, 1.04, 'drawerQuote', qc, 0.011);
    const tape = new T.Mesh(new T.PlaneGeometry(0.34, 0.1), new T.MeshStandardMaterial({ color: 0xfde68a, roughness: .9, transparent: true, opacity: .85 })); tape.rotation.x = -Math.PI / 2; tape.rotation.z = 0.3; tape.position.set(0.5, Y0 + 0.034, -1.72); tape.rotation.z = -0.35; dg.add(tape);
    this.drawDrawerQuote();
    dg.position.set(-1.3, apY, 3.56); this.scene.add(dg);
    let dz = 0;
    const it = this.add('drawer', dg, -1.3, 3.56, 0, { static: true, ay: apY + 0.9, rs: 0.001, anim: (hv) => { const tg = this.drawerOpen ? 3.05 : hv * 0.4; dz += (tg - dz) * 0.12; dg.position.z = 3.56 + dz; } });
    dg.position.y = apY;
  }
  buildLaptop() {
    const T = this.T, g = new T.Group(), alu = new T.MeshStandardMaterial({ color: 0x1b1f27, roughness: .42, metalness: .4, envMapIntensity: .35 });
    const base = this.rbox(3.2, 0.14, 2.1, 0.1, alu); base.position.y = 0.07; g.add(base);
    const kb = this.rbox(2.8, 0.02, 1.0, 0.03, this.M(0x14171d, { r: .7 })); kb.position.set(0, 0.15, -0.28); g.add(kb);
    const tp = this.rbox(0.95, 0.012, 0.55, 0.04, new T.MeshStandardMaterial({ color: 0x2a2f39, roughness: .35, metalness: .3, envMapIntensity: .3 })); tp.position.set(0, 0.146, 0.56); g.add(tp);
    const pv = new T.Group(); pv.position.set(0, 0.14, -1.02); g.add(pv);
    const lid = this.rbox(3.2, 2.05, 0.08, 0.1, alu); lid.position.set(0, 1.03, 0); pv.add(lid);
    const bez = new T.Mesh(new T.PlaneGeometry(3.04, 1.92), new T.MeshStandardMaterial({ color: 0x07080b, roughness: .25 })); bez.position.set(0, 1.04, 0.042); pv.add(bez);
    this.halo = new T.Mesh(new T.PlaneGeometry(4.4, 3.3), new T.MeshBasicMaterial({ map: this.tex.glow, color: 0xfbbf24, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false }));
    this.halo.position.set(0, 1.04, -0.06); pv.add(this.halo);
    const scr = new T.Mesh(new T.PlaneGeometry(2.92, 1.8), new T.MeshBasicMaterial({ map: this.tex.screen, toneMapped: false }));
    this.scrMat = scr.material;
    this.vidCv = document.createElement('canvas'); this.vidCv.width = 1024; this.vidCv.height = 640; this.vidX = this.vidCv.getContext('2d');
    this.vidTex = new T.CanvasTexture(this.vidCv); this.vidTex.encoding = T.sRGBEncoding; this.vidTex.anisotropy = 8;
    scr.position.set(0, 1.04, 0.046); pv.add(scr); pv.rotation.x = -0.2;
    const logo = new T.Mesh(new T.CircleGeometry(0.16, 32), new T.MeshStandardMaterial({ color: 0x5b6270, roughness: .2, metalness: .8 })); logo.position.set(0, 1.03, -0.042); logo.rotation.y = Math.PI; pv.add(logo);
    this.add('mycourse', g, 0, -1.55, 0, { ay: 2.5, fd: 1.4, rs: 2.1, anim: (h) => { pv.rotation.x = -0.2 - h * 0.22; } });
  }
  drawVideo(T0) {
    const x = this.vidX, w = 1024, h = 640, F = "'Mitr', sans-serif", B = "'IBM Plex Sans Thai Looped', sans-serif", HW = "'Itim', cursive";
    const t = T0 % 14, cl = (v) => Math.max(0, Math.min(1, v));
    const rr = (X, Y, W, H, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); };
    x.textAlign = 'left'; x.globalAlpha = 1;
    x.fillStyle = '#0b1220'; x.fillRect(0, 0, w, h);
    ['#f87171', '#fbbf24', '#34d399'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(30 + i * 24, 26, 7, 0, 7); x.fill(); });
    x.fillStyle = '#e2e8f0'; x.font = `600 24px ${B}`; x.fillText('คอร์สของฉัน · บทที่ 3 สมการเชิงเส้น', 110, 34);
    const VX = 24, VY = 54, VW = 976, VH = 460;
    const g = x.createLinearGradient(0, VY, 0, VY + VH); g.addColorStop(0, '#24443f'); g.addColorStop(1, '#172f2b'); x.fillStyle = g; rr(VX, VY, VW, VH, 18); x.fill();
    x.save(); rr(VX, VY, VW, VH, 18); x.clip();
    x.fillStyle = 'rgba(255,255,255,.16)'; x.font = `600 26px ${F}`; x.fillText('โจทย์: สองเท่าของจำนวนหนึ่งบวกห้า ได้สิบเจ็ด', VX + 60, VY + 50);
    const lines = [['2x + 5 = 17', 0.6, 2.2], ['2x = 17 − 5', 2.8, 4.4], ['2x = 12', 5.0, 6.0], ['x = 6', 6.6, 7.4]];
    x.font = `64px ${HW}`; let pen = null;
    lines.forEach(([s, a, b], i) => {
      const y = VY + 140 + i * 82, X0 = VX + 70, full = x.measureText(s).width, p = cl((t - a) / (b - a)); if (p <= 0) return;
      x.save(); x.beginPath(); x.rect(X0 - 10, y - 70, full * p + 14, 92); x.clip(); x.fillStyle = i === 3 ? '#fde68a' : '#f8fafc'; x.fillText(s, X0, y); x.restore();
      if (p < 1) pen = [X0 + full * p, y - 22];
    });
    const cp = cl((t - 7.6) / 0.8);
    if (cp > 0) { x.strokeStyle = '#f87171'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.ellipse(VX + 138, VY + 140 + 3 * 82 - 22, 112, 48, -0.05, -Math.PI / 2, -Math.PI / 2 + cp * Math.PI * 2); x.stroke(); }
    const kp = cl((t - 8.5) / 0.45);
    if (kp > 0) { const ax = VX + 290, ay = VY + 140 + 3 * 82 - 22; x.strokeStyle = '#4ade80'; x.lineWidth = 9; x.beginPath(); x.moveTo(ax, ay); const m = [ax + 22, ay + 24], e = [ax + 66, ay - 34]; if (kp < .4) x.lineTo(ax + (m[0] - ax) * kp / .4, ay + (m[1] - ay) * kp / .4); else { x.lineTo(m[0], m[1]); const q = (kp - .4) / .6; x.lineTo(m[0] + (e[0] - m[0]) * q, m[1] + (e[1] - m[1]) * q); } x.stroke(); }
    const tp = cl((t - 3.2) / 0.5);
    if (tp > 0) { const dy = (1 - tp) * 24; x.globalAlpha = tp; x.fillStyle = '#fde047'; rr(VX + 560, VY + 110 - dy, 350, 112, 16); x.fill(); x.fillStyle = '#0f172a'; x.font = `600 32px ${F}`; x.fillText('ย้ายข้าง', VX + 586, VY + 158 - dy); x.font = `600 26px ${B}`; x.fillText('= เปลี่ยนเครื่องหมาย', VX + 586, VY + 198 - dy); x.globalAlpha = 1; }
    if (t > 9.4) { const sp = cl((t - 9.4) / 0.5), s = 0.6 + 0.4 * sp; x.save(); x.globalAlpha = sp; x.translate(VX + 740, VY + 300); x.scale(s, s); x.rotate(-0.08); x.fillStyle = '#f59e0b'; x.font = `600 72px ${F}`; x.textAlign = 'center'; x.fillText('อ๋อ!', 0, 0); x.restore(); x.globalAlpha = 1; x.textAlign = 'left'; }
    if (pen) { x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(pen[0] + 8, pen[1], 18, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.arc(pen[0] + 8, pen[1], 8, 0, 7); x.fill(); }
    const ax = VX + VW - 100, ay = VY + VH - 118;
    x.fillStyle = '#5eead4'; x.beginPath(); x.arc(ax, ay, 70, 0, 7); x.fill();
    if (this.avatarImg) { x.save(); x.beginPath(); x.arc(ax, ay, 64, 0, 7); x.clip(); x.fillStyle = '#fff'; x.fillRect(ax - 64, ay - 64, 128, 128); x.drawImage(this.avatarImg, ax - 64, ay - 64, 128, 128); x.restore(); }
    for (let i = 0; i < 5; i++) { const bh = 8 + Math.abs(Math.sin(T0 * 9 + i * 1.3)) * 28; x.fillStyle = '#5eead4'; rr(ax - 70 + i * 16, ay + 94 - bh, 9, bh, 4); x.fill(); }
    const subs = [[0, 2.6, 'ตั้งสมการจากโจทย์ก่อนนะครับ'], [2.6, 4.8, 'ย้าย 5 ไปอีกฝั่ง กลายเป็นลบ 5'], [4.8, 6.4, '17 ลบ 5 ได้ 12'], [6.4, 9.2, 'หารด้วย 2 ได้ x เท่ากับ 6'], [9.2, 14, 'อ๋อ! ง่ายนิดเดียว ลองทำข้อถัดไปกัน']];
    const sub = subs.find(s => t >= s[0] && t < s[1]);
    if (sub) { x.font = `600 28px ${B}`; const sw = x.measureText(sub[2]).width, cx = VX + (VW - 200) / 2; x.fillStyle = 'rgba(0,0,0,.62)'; rr(cx - sw / 2 - 18, VY + VH - 64, sw + 36, 46, 12); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(sub[2], cx, VY + VH - 32); x.textAlign = 'left'; }
    if (T0 < 0.9) { const f = 1 - T0 / 0.9, s = 1 + T0 * 0.6; x.save(); x.globalAlpha = f; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(VX, VY, VW, VH); x.translate(VX + VW / 2, VY + VH / 2); x.scale(s, s); x.fillStyle = '#fbbf24'; x.beginPath(); x.arc(0, 0, 70, 0, 7); x.fill(); x.fillStyle = '#0f172a'; x.beginPath(); x.moveTo(-22, -34); x.lineTo(-22, 34); x.lineTo(36, 0); x.closePath(); x.fill(); x.restore(); x.globalAlpha = 1; }
    x.restore();
    const CY = 536;
    x.fillStyle = '#fff'; x.fillRect(VX + 8, CY + 18, 9, 30); x.fillRect(VX + 26, CY + 18, 9, 30);
    const total = 12 * 60 + 40, cur = 3 * 60 + 12 + Math.floor(T0), fm = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    x.fillStyle = '#cbd5e1'; x.font = `600 22px ${B}`; x.fillText(fm(cur) + ' / ' + fm(total), VX + 58, CY + 42);
    const px0 = VX + 230, pw = VW - 230 - 110, pr = (3 * 60 + 12 + T0) / total;
    x.fillStyle = 'rgba(255,255,255,.18)'; rr(px0, CY + 28, pw, 10, 5); x.fill();
    x.fillStyle = '#fbbf24'; rr(px0, CY + 28, Math.max(10, pw * pr), 10, 5); x.fill();
    [0.25, 0.5, 0.75].forEach(f => { x.fillStyle = '#0b1220'; x.fillRect(px0 + pw * f, CY + 28, 3, 10); });
    x.fillStyle = '#fff'; x.beginPath(); x.arc(px0 + pw * pr, CY + 33, 11, 0, 7); x.fill();
    x.fillStyle = '#e2e8f0'; x.font = `700 20px ${B}`; x.fillText('HD', VX + VW - 92, CY + 42);
    for (let i = 0; i < 3; i++) x.fillRect(VX + VW - 44 + i * 9, CY + 42 - (i + 1) * 8, 6, (i + 1) * 8);
  }
  buildCalendar() {
    const T = this.T, g = new T.Group();
    const fp = new T.Group(); fp.position.z = 0.42; fp.rotation.x = -0.18; g.add(fp);
    const fs = this.rbox(1.8, 1.62, 0.06, 0.05, this.M(0xf8fafc)); fs.position.y = 0.81; fp.add(fs);
    const face = new T.Mesh(new T.PlaneGeometry(1.64, 1.47), new T.MeshStandardMaterial({ map: this.tex.cal, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    face.position.set(0, 0.8, 0.052); face.renderOrder = 2; fp.add(face);
    const bp = new T.Group(); bp.position.z = -0.42; bp.rotation.x = 0.18; g.add(bp);
    const bs = this.rbox(1.8, 1.62, 0.06, 0.05, this.M(0x1e293b, { r: .5 })); bs.position.y = 0.81; bp.add(bs);
    [-0.5, 0.5].forEach(x => { const r = this.mesh(new T.TorusGeometry(0.17, 0.024, 10, 28), this.M(0xf59e0b, { r: .3, m: .4 })); r.position.set(x, 1.52, 0); r.rotation.y = Math.PI / 2; g.add(r); });
    this.add('countdown', g, 3.95, -2.2, -0.22, { ay: 2.1, fd: 1.05, rs: 1.3, anim: (h) => { fp.rotation.x = -0.18 + h * 0.1; } });
  }
  buildLamp() {
    const T = this.T, g = new T.Group(), ink = this.M(0x1e293b, { r: .35, m: .3 });
    const base = this.mesh(new T.CylinderGeometry(0.55, 0.62, 0.16, 48), ink); base.position.y = 0.08; g.add(base);
    const seg = (a, b, r) => { const d = new T.Vector3().subVectors(b, a), L = d.length(); const m = this.mesh(new T.CapsuleGeometry(r, L, 6, 16), ink); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); g.add(m); };
    const p1 = new T.Vector3(0, 0.16, 0), p2 = new T.Vector3(-0.35, 2.25, 0.2), p3 = new T.Vector3(-1.45, 2.85, 0.9);
    seg(p1, p2, 0.06); seg(p2, p3, 0.055);
    const j = this.mesh(new T.SphereGeometry(0.12, 20, 20), this.M(0xf59e0b, { r: .3, m: .3 })); j.position.copy(p2); g.add(j);
    const head = new T.Group(); head.position.copy(p3); g.add(head);
    const tgt = new T.Vector3(-3.2, 0, 1.9), dir = new T.Vector3().subVectors(tgt, p3).normalize();
    head.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), dir);
    const cone = this.mesh(new T.ConeGeometry(0.5, 0.72, 48, 1, true), new T.MeshStandardMaterial({ color: 0x1e293b, roughness: .35, metalness: .3, side: T.DoubleSide }));
    head.add(cone);
    this.bulbMat = new T.MeshStandardMaterial({ color: 0xfff7e6, emissive: 0xffd28a, emissiveIntensity: 0, roughness: .3 });
    const bulb = new T.Mesh(new T.SphereGeometry(0.17, 20, 20), this.bulbMat); bulb.position.y = -0.2; head.add(bulb);
    const sp = this.spot = new T.SpotLight(0xffd79a, 0, 16, 0.75, 0.55, 1.3); sp.position.copy(p3); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0005;
    const to = new T.Object3D(); to.position.copy(tgt); g.add(to); sp.target = to; g.add(sp);
    this.add('lamp', g, 5.75, -2.85, 0, { ay: 3.3, rs: 0.9, anim: (h) => { this.lampHover = h; } });
  }
  buildBooks() {
    const T = this.T, g = new T.Group(), list = this.BOOK_CATS.slice().reverse().concat([null]);
    let y = 0; this.books = [];
    list.forEach((cat, i) => {
      const top = cat === null, th = top ? 0.34 : 0.38 + ((i * 37) % 5) * 0.025, w = top ? 2.62 : 2.52 - ((i * 53) % 4) * 0.07, d = top ? 1.84 : 1.72 - ((i * 29) % 3) * 0.05;
      const si = top ? this.BOOK_CATS.length : this.BOOK_CATS.indexOf(cat), col = top ? this.SPINE[this.SPINE.length - 1] : this.SPINE[si % this.SPINE.length];
      const b = new T.Group(); b.position.set((((i * 41) % 5) - 2) * 0.035, y + th / 2, 0); b.rotation.y = (((i * 67) % 7) - 3) * 0.018; g.add(b);
      const pg = this.rbox(w - 0.1, th - 0.07, d - 0.1, 0.03, this.M(0xfbf6ea, { r: .9 })); pg.position.z = -0.03; b.add(pg);
      const cm = this.M(col, { r: .55 });
      const tp = this.rbox(w, 0.045, d, 0.03, cm); tp.position.y = th / 2 - 0.022; b.add(tp);
      const bt = this.rbox(w, 0.045, d, 0.03, cm); bt.position.y = -th / 2 + 0.022; b.add(bt);
      const spn = this.rbox(w, th, 0.08, 0.03, cm); spn.position.z = d / 2 - 0.04; b.add(spn);
      const lab = new T.Mesh(new T.PlaneGeometry(w - 0.06, th - 0.03), new T.MeshStandardMaterial({ map: this.tex['sp' + si], roughness: .7 }));
      lab.position.z = d / 2 + 0.003; b.add(lab);
      if (top) this.decal(w - 0.14, d - 0.12, 'cover', tp, 0.024);
      this.books.push({ b, cat, o: 0, y0: b.position.y });
      y += th;
    });
    this.books.forEach((o, i) => o.b.traverse(n => { if (n.isMesh) n.userData.book = i; }));
    this.add('courses', g, -4.45, -1.25, 0.14, { ay: y + 0.25, fd: 1.4, rs: 1.8, anim: (hv) => {
      this.books.forEach((o, i) => { const on = hv > 0.05 && this.hoverBookIdx === i; o.o += ((on ? 1 : 0) - o.o) * 0.18; o.b.position.z = o.o * 0.55; o.b.position.y = o.y0 + o.o * 0.04; });
    } });
  }
  buildTips() {
    const T = this.T, g = new T.Group();
    const mk = (y, col, ry) => { const b = new T.Group(); b.position.y = y; b.rotation.y = ry; const pg = this.rbox(1.55, 0.16, 1.15, 0.03, this.M(0xfbf6ea, { r: .9 })); b.add(pg); const c = this.M(col); const t = this.rbox(1.64, 0.035, 1.24, 0.03, c); t.position.y = 0.095; b.add(t); const bo = this.rbox(1.64, 0.035, 1.24, 0.03, c); bo.position.y = -0.095; b.add(bo); const sp = this.rbox(0.06, 0.22, 1.24, 0.02, c); sp.position.x = -0.81; b.add(sp); g.add(b); return { b, t }; };
    mk(0.115, 0xfde68a, 0.1); const b2 = mk(0.345, 0x1e293b, -0.1); this.decal(1.56, 1.16, 'tipsCover', b2.t, 0.019);
    this.add('tips', g, -5.1, 2.25, 0.18, { ay: 0.6, fd: 0.9, rs: 1.15, anim: (hv) => { b2.b.rotation.y = -0.1 + hv * 0.32; b2.b.position.y = 0.345 + hv * 0.16; } });
  }
  pencil(len) {
    const T = this.T, g = new T.Group();
    const body = this.mesh(new T.CylinderGeometry(0.07, 0.07, len, 6), this.M(0xf59e0b, { r: .5 })); g.add(body);
    const tip = this.mesh(new T.ConeGeometry(0.07, 0.24, 6), this.M(0xf3d9b1, { r: .8 })); tip.position.y = len / 2 + 0.12; g.add(tip);
    const lead = this.mesh(new T.ConeGeometry(0.025, 0.08, 6), this.M(0x334155)); lead.position.y = len / 2 + 0.2; g.add(lead);
    const fer = this.mesh(new T.CylinderGeometry(0.074, 0.074, 0.09, 16), this.M(0xcbd5e1, { r: .3, m: .6 })); fer.position.y = -len / 2 - 0.045; g.add(fer);
    const er = this.mesh(new T.CylinderGeometry(0.07, 0.07, 0.14, 16), this.M(0xfb7185)); er.position.y = -len / 2 - 0.16; g.add(er);
    g.rotation.z = Math.PI / 2; const w = new T.Group(); w.add(g); return w;
  }
  buildNotebook() {
    const T = this.T, g = new T.Group();
    const cover = this.rbox(3.55, 0.05, 2.42, 0.07, this.M(0x0f766e)); cover.position.y = 0.025; g.add(cover);
    const mk = (side, key) => { const p = this.rbox(1.7, 0.05, 2.3, 0.03, this.M(0xfffdf7, { r: .9 })); p.position.set(side * 0.87, 0.078, 0); this.decal(1.62, 2.2, key, p, 0.027); g.add(p); return p; };
    const L = mk(-1, 'noteL'), Rp = mk(1, 'noteR');
    const spine = this.mesh(new T.CylinderGeometry(0.03, 0.03, 2.3, 12), this.M(0x94a3b8)); spine.rotation.x = Math.PI / 2; spine.position.y = 0.09; g.add(spine);
    const rib = this.mesh(new T.BoxGeometry(0.16, 0.012, 0.7), this.M(0xf43f5e, { r: .5 })); rib.position.set(0.35, 0.02, 1.4); rib.rotation.y = 0.12; g.add(rib);
    const PL = 1.35, pc = this.pencil(PL); pc.position.x = PL / 2 + 0.24;
    const tilt = new T.Group(); tilt.rotation.z = 0.95; tilt.add(pc);
    const yawG = new T.Group(); yawG.rotation.y = -0.55; yawG.add(tilt);
    const tipG = new T.Group(); tipG.add(yawG); g.add(tipG);
    const base = new T.Vector3(0.62, 0.108, 0.3);
    g.scale.setScalar(0.85);
    const add0 = this.add('summary', g, 4.62, 2.05, -0.1, { bs: 0.85, ay: 0.8, fd: 1.0, rs: 1.85, anim: (hv, t) => {
      const s = Math.max(0, Math.min(1, hv)), e = s * s * (3 - 2 * s);
      this._pw = (this._pw || 0) + (s > 0.02 ? 1 / 60 * 1.8 : 0); const tt = this._pw, line = (tt * 0.12) % 0.55;
      const lift = Math.sin(tt * 1.3 + 1) > 0.97 ? 0.03 : 0;
      tipG.position.set(base.x + (line + Math.sin(tt * 7.5) * 0.045) * e, base.y + (1 - e) * 0.07 + lift * e, base.z + (Math.sin(tt * 15) * 0.028 + (Math.floor((tt * 0.12) / 0.55) % 3) * 0.12 - 0.12) * e);
      tilt.rotation.z = e * (0.95 + Math.sin(tt * 7.5 + 0.6) * 0.05); yawG.rotation.y = -0.55 + Math.sin(tt * 3.1) * 0.04 * e;
    } });
    { const pm = new Set(); tipG.traverse(n => { if (n.isMesh) pm.add(n); }); this.hitList = this.hitList.filter(m => !pm.has(m)); }
    { const pm = new Set(); pc.traverse(n => { if (n.isMesh) pm.add(n); }); this.hitList = this.hitList.filter(m => !pm.has(m)); }
  }
  buildCards() {
    const T = this.T, g = new T.Group(), cards = [], cols = [0xccfbf1, 0xfef3c7, 0xffffff, 0xe0f2fe, 0xffffff];
    for (let i = 0; i < 5; i++) { const c = this.rbox(1.5, 0.018, 1.0, 0.03, this.M(cols[i], { r: .9 })); c.position.y = 0.01 + i * 0.02; c.rotation.y = (i - 2) * 0.07; g.add(c); cards.push(c); }
    this.decal(1.42, 0.94, 'cardSum', cards[4], 0.01);
    const ring = this.mesh(new T.TorusGeometry(0.11, 0.02, 10, 28), this.M(0xcbd5e1, { r: .25, m: .8 })); ring.position.set(-0.6, 0.12, -0.36); ring.rotation.y = Math.PI / 2; g.add(ring);
    this.add('summary', g, -4.55, 0.05, 0.35, { ay: 0.6, fd: 0.8, rs: 1.05, anim: (hv) => { cards.forEach((c, i) => { c.rotation.y = (i - 2) * 0.07 + hv * (i - 2) * 0.16; c.position.x = hv * (i - 2) * 0.08; }); cards[4].position.y = 0.09 + hv * 0.14; } });
  }
  buildPapers() {
    const T = this.T, g = new T.Group();
    this.tx('paperEdge', this.cv(64, 512, (x, w, h) => {
      x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, w, h); let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let y = 0; y < h; y += 6) { x.fillStyle = 'rgba(71,85,105,' + (0.22 + r() * 0.3) + ')'; x.fillRect(0, y, w, 2); }
      ['#5eead4', '#fcd34d', '#fda4af', '#a5b4fc'].forEach(c => { const y = Math.floor(r() * h / 4) * 4; x.fillStyle = c; x.fillRect(0, y, w, 3); });
    }));
    const et = this.tex.paperEdge; et.wrapS = et.wrapT = T.RepeatWrapping;
    const edgeM = new T.MeshStandardMaterial({ map: et, roughness: .95, envMapIntensity: .2 }), topM = this.M(0xffffff, { r: .9 }), kraft = this.M(0xc8a27a, { r: .85 });
    const bundles = []; let y = 0;
    [[1.95, 0.3, 2.5, 0.04], [1.9, 0.26, 2.45, -0.07], [1.97, 0.28, 2.52, 0.1], [1.92, 0.24, 2.47, -0.03], [1.96, 0.29, 2.5, 0.07], [1.9, 0.25, 2.44, -0.09], [1.94, 0.27, 2.49, 0.03]].forEach(([w, hh, d, ry], i) => {
      const b = new T.Group(); b.position.y = y + hh / 2; b.rotation.y = ry; g.add(b);
      b.add(this.mesh(new T.BoxGeometry(w, hh, d), [edgeM, edgeM, topM, topM, edgeM, edgeM]));
      const band = this.mesh(new T.BoxGeometry(0.3, hh + 0.012, d + 0.012), kraft); band.position.x = (i % 2 ? -0.35 : 0.3); b.add(band);
      bundles.push({ b, ry, y0: b.position.y }); y += hh;
    });
    const tabCols = [0x14b8a6, 0xf59e0b, 0xf43f5e, 0x6366f1, 0x14b8a6, 0xf59e0b];
    tabCols.concat(tabCols).forEach((c, i) => { const tb = this.mesh(new T.BoxGeometry(0.22, 0.025, 0.28), this.M(c, { r: .6 })); tb.position.set(i % 2 ? 1.02 : -1.02, 0.12 + i * 0.15, -0.9 + (i % 3) * 0.7); g.add(tb); });
    const sheets = [];
    for (let i = 0; i < 4; i++) { const s = this.rbox(2.1, 0.02, 2.7, 0.02, this.M(0xffffff, { r: .9 })); s.position.y = y + 0.012 + i * 0.024; s.rotation.y = (i - 1.5) * 0.06; g.add(s); sheets.push(s); }
    this.decal(2.0, 2.58, 'exam', sheets[3], 0.011);
    const top = sheets[3], topY = top.position.y;
    const pc = this.pencil(1.8); pc.position.set(0.5, y + 0.17, 0.35); pc.rotation.y = -0.75; g.add(pc);
    this.add('exams', g, 2.0, 2.0, 0.12, { ay: y + 0.55, fd: 1.18, rs: 1.8, anim: (hv) => {
      top.rotation.y = 0.09 + hv * 0.18; top.position.x = hv * 0.25; top.position.y = topY + hv * 0.1;
      sheets[2].rotation.y = 0.03 - hv * 0.1; sheets[1].rotation.y = -0.03 + hv * 0.06;
      bundles.forEach((o, i) => { o.b.rotation.y = o.ry + hv * (i % 2 ? -0.06 : 0.06); });
      pc.position.y = y + 0.17 + hv * 0.14;
    } });
  }
  buildSticky() {
    const T = this.T, g = new T.Group(), sheets = [], cols = [0xfff1e0, 0xfdf6e3, 0xfffaf0];
    for (let i = 0; i < 3; i++) { const s = this.rbox(1.35, 0.02, 1.75, 0.02, this.M(cols[i], { r: .9 })); s.position.y = 0.012 + i * 0.022; s.rotation.y = (i - 1) * 0.14; g.add(s); sheets.push(s); }
    this.decal(1.3, 1.69, 'letter', sheets[2], 0.011);
    const top = sheets[2];
    this.add('reviews', g, 4.5, 2.0, -0.25, { ay: 0.7, fd: 0.95, rs: 1.25, anim: (hv) => { top.rotation.x = hv * 0.55; top.position.y = 0.056 + hv * 0.55; top.position.z = hv * 0.35; } });
  }
  makePhoneTex() {
    const F = "'Mitr', sans-serif", B = "'IBM Plex Sans Thai Looped', sans-serif";
    this.tx('phone', this.cv(440, 920, (x, w, h) => {
      const rr = (X, Y, W, H, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); };
      x.clearRect(0, 0, w, h); rr(0, 0, w, h, 64); x.save(); x.clip();
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#134e4a'); g.addColorStop(1, '#0b1220'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#000'; rr(w / 2 - 70, 22, 140, 38, 19); x.fill();
      x.fillStyle = '#fff'; x.font = `600 26px ${B}`; x.fillText('09:41', 40, 50);
      x.fillStyle = '#5eead4'; x.beginPath(); x.arc(w / 2, 250, 96, 0, 7); x.fill();
      if (this.avatarImg) { x.save(); x.beginPath(); x.arc(w / 2, 250, 88, 0, 7); x.clip(); x.fillStyle = '#fff'; x.fillRect(w / 2 - 88, 162, 176, 176); x.drawImage(this.avatarImg, w / 2 - 88, 162, 176, 176); x.restore(); }
      x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `600 58px ${F}`; x.fillText('ครูฮีม', w / 2, 410);
      x.fillStyle = '#99f6e4'; x.font = `500 26px ${B}`; x.fillText('KruHeem Math School', w / 2, 452);
      [['#06c755', 'LINE'], ['#1877f2', 'f'], ['#dd2a7b', 'IG'], ['#ef4444', '@']].forEach(([c, s], i) => {
        const cx = 70 + i * 100, cy = 560; x.fillStyle = c; x.beginPath(); x.arc(cx, cy, 36, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.font = `800 ${s.length > 2 ? 20 : 28}px ${B}`; x.fillText(s, cx, cy + 10);
      });
      x.fillStyle = '#06c755'; rr(50, 700, w - 100, 96, 48); x.fill();
      x.fillStyle = '#fff'; x.font = `600 40px ${F}`; x.fillText('ทักครูฮีม', w / 2, 762);
      x.fillStyle = 'rgba(255,255,255,.5)'; rr(w / 2 - 70, h - 30, 140, 8, 4); x.fill();
      x.restore();
    }));
  }
  buildPhone() {
    const T = this.T, g = new T.Group(), sm = this.M(0x1e293b, { r: .4, m: .3 });
    const st = this.rbox(1.15, 0.12, 0.85, 0.06, sm); st.position.y = 0.06; g.add(st);
    const lip = this.rbox(1.15, 0.2, 0.1, 0.04, sm); lip.position.set(0, 0.22, 0.34); g.add(lip);
    const back = this.rbox(0.5, 0.1, 1.2, 0.04, sm); back.rotation.x = Math.PI / 2 - 0.32; back.position.set(0, 0.62, -0.25); g.add(back);
    const pv = new T.Group(); pv.position.set(0, 0.14, 0.24); pv.rotation.x = -0.32; g.add(pv);
    const body = this.rbox(0.98, 0.1, 2.0, 0.17, new T.MeshStandardMaterial({ color: 0x2b2f36, roughness: .3, metalness: .6, envMapIntensity: .5 }));
    body.rotation.x = Math.PI / 2; body.position.set(0, 1.0, -0.06); pv.add(body);
    const scr = new T.Mesh(new T.PlaneGeometry(0.9, 1.92), new T.MeshBasicMaterial({ map: this.tex.phone, transparent: true, toneMapped: false }));
    scr.position.set(0, 1.0, -0.006); pv.add(scr);
    this.phoneGlow = new T.Mesh(new T.PlaneGeometry(1.9, 2.9), new T.MeshBasicMaterial({ map: this.tex.glow, color: 0x34d399, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    this.phoneGlow.position.set(0, 1.0, -0.14); pv.add(this.phoneGlow);
    this.add('contact', g, -2.3, -0.2, 0.18, { ay: 2.6, fd: 1.05, rs: 0.85, anim: (hv, t) => { pv.rotation.x = -0.32 + hv * 0.1; pv.rotation.z = hv > 0.3 ? Math.sin(t * 70) * 0.025 * Math.max(0, Math.sin(t * 2.5)) : 0; this.phoneGlow.material.opacity = hv * 0.7; } });
  }
  buildApply() {
    const T = this.T, F = "'Mitr', sans-serif", B = "'IBM Plex Sans Thai Looped', sans-serif", g = new T.Group();
    this.tx('form', this.cv(600, 820, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fbbf24'; x.fillRect(0, 0, w, 150);
      x.fillStyle = '#0f172a'; x.font = `600 76px ${F}`; x.fillText('ใบสมัครเรียน', 40, 100);
      x.fillStyle = '#92400e'; x.font = `700 22px ${B}`; x.fillText('KRUHEEM MATH SCHOOL', 44, 136);
      const line = (label, y, fill) => { x.fillStyle = '#475569'; x.font = `600 28px ${B}`; x.fillText(label, 40, y); x.strokeStyle = '#cbd5e1'; x.lineWidth = 3; x.beginPath(); x.moveTo(40 + x.measureText(label).width + 14, y + 6); x.lineTo(w - 40, y + 6); x.stroke(); if (fill) { x.fillStyle = '#1d4ed8'; x.font = "36px 'Itim', cursive"; x.fillText(fill, 40 + x.measureText(label).width + 40, y - 2); } };
      line('ชื่อนักเรียน', 230, 'น้องภูมิ'); line('ระดับชั้น', 300, '');
      [['ประถม', 60], ['ม.ต้น', 200], ['ม.ปลาย', 330], ['สอบเข้า', 470]].forEach(([s, cx], i) => { x.strokeStyle = '#0f766e'; x.lineWidth = 3; x.strokeRect(cx - 20, 332, 28, 28); x.fillStyle = '#334155'; x.font = `600 24px ${B}`; x.fillText(s, cx + 16, 356); if (i === 3) { x.strokeStyle = '#ef4444'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - 16, 344); x.lineTo(cx - 6, 356); x.lineTo(cx + 14, 326); x.stroke(); } });
      line('คอร์สที่สนใจ', 440, 'ติวสอบเข้า ม.1'); line('ผู้ปกครอง', 510, '');
      x.setLineDash([12, 10]); x.strokeStyle = '#94a3b8'; x.lineWidth = 3; x.beginPath(); x.arc(w - 150, 660, 100, 0, 7); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#94a3b8'; x.font = `600 22px ${B}`; x.textAlign = 'center'; x.fillText('ประทับตรา', w - 150, 668); x.textAlign = 'left';
      x.fillStyle = '#0f172a'; x.font = `600 26px ${B}`; x.fillText('ลงชื่อ', 40, 700); x.strokeStyle = '#cbd5e1'; x.beginPath(); x.moveTo(120, 706); x.lineTo(320, 706); x.stroke();
    }));
    this.tx('approve', this.cv(320, 320, (x, w, h) => {
      x.clearRect(0, 0, w, h); x.translate(w / 2, h / 2); x.rotate(-0.22);
      x.strokeStyle = '#059669'; x.fillStyle = '#059669'; x.lineWidth = 12; x.beginPath(); x.arc(0, 0, 140, 0, 7); x.stroke(); x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 118, 0, 7); x.stroke();
      x.textAlign = 'center'; x.font = `600 64px ${F}`; x.fillText('สมัครเลย!', 0, 22);
      x.font = `700 22px ${B}`; x.fillText('KRUHEEM', 0, -58); x.fillText('★ ★ ★', 0, 80);
    }));
    const cb = new T.Group(); cb.position.set(0, 0.035, 0); cb.rotation.x = 0; g.add(cb);
    const board = this.rbox(1.72, 0.06, 2.34, 0.1, this.M(0x9a6b44, { r: .6 })); cb.add(board);
    const paper = this.rbox(1.56, 0.02, 2.08, 0.02, this.M(0xffffff, { r: .9 })); paper.position.set(0, 0.04, 0.08); cb.add(paper);
    this.decal(1.52, 2.04, 'form', paper, 0.011);
    const mark = new T.Mesh(new T.PlaneGeometry(0.62, 0.62), new T.MeshBasicMaterial({ map: this.tex.approve, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(0.5, 0.062, 0.68); cb.add(mark);
    const clipM = this.M(0x0d9488, { r: .3, m: .5 });
    const clip = this.rbox(0.9, 0.12, 0.3, 0.05, clipM); clip.position.set(0, 0.09, -1.02); cb.add(clip);
    const clamp = this.mesh(new T.CylinderGeometry(0.06, 0.06, 0.7, 16), this.M(0xd6d3d1, { r: .25, m: .8 })); clamp.rotation.z = Math.PI / 2; clamp.position.set(0, 0.16, -0.9); cb.add(clamp);
        const st = new T.Group(); g.add(st);
    const pad = this.rbox(0.5, 0.06, 0.36, 0.03, this.M(0x059669, { r: .7 })); pad.position.y = 0.03; st.add(pad);
    const blk = this.rbox(0.5, 0.2, 0.36, 0.05, this.M(0xc8a27a, { r: .5 })); blk.position.y = 0.16; st.add(blk);
    const neck = this.mesh(new T.CylinderGeometry(0.07, 0.09, 0.3, 16), this.M(0xc8a27a, { r: .5 })); neck.position.y = 0.41; st.add(neck);
    const knob = this.mesh(new T.SphereGeometry(0.17, 24, 18), this.M(0xef4444, { r: .35 })); knob.position.y = 0.62; st.add(knob);
    const rest = new T.Vector3(1.3, 0, -0.55), tgt = new T.Vector3(), q0 = new T.Quaternion(), up = new T.Vector3();
    this._stampMeshes = []; st.traverse(n => { if (n.isMesh) this._stampMeshes.push(n); });
    this.add('apply', g, -1.2, 2.15, -0.1, { ay: 0.55, fd: 1.05, rs: 1.6, anim: (hv) => {
      cb.updateMatrix(); tgt.set(0.5, 0.07, 0.68).applyMatrix4(cb.matrix); up.set(0, 1, 0).applyQuaternion(cb.quaternion);
      const e = Math.min(1, hv * 1.15), arc = Math.sin(Math.PI * Math.min(1, e / 0.8)) * 0.9, press = e > 0.8 ? (1 - (e - 0.8) / 0.2) * 0.35 : 0.35;
      st.position.lerpVectors(rest, tgt, Math.min(1, e / 0.8)); st.position.y += arc * (e < 0.8 ? 1 : 0); if (e >= 0.8) st.position.addScaledVector(up, press);
      st.quaternion.slerpQuaternions(q0, cb.quaternion, Math.min(1, e / 0.8));
      mark.material.opacity = Math.max(0, (e - 0.9) / 0.1);
    } });
  }
  buildGlass() {
    const T = this.T, g = new T.Group();
    const gm = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 2.2, side: T.DoubleSide, depthWrite: false });
    const wall = new T.Mesh(new T.CylinderGeometry(0.42, 0.36, 1.25, 48, 1, true), gm); wall.position.y = 0.625; wall.renderOrder = 3; g.add(wall);
    const bm = gm.clone(); bm.opacity = 0.5; const base = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.08, 48), bm); base.position.y = 0.04; base.renderOrder = 3; g.add(base);
    const lip = new T.Mesh(new T.TorusGeometry(0.42, 0.018, 10, 60), new T.MeshStandardMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .8 })); lip.rotation.x = Math.PI / 2; lip.position.y = 1.25; g.add(lip);
    const wm = new T.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.15, transparent: true, opacity: 0.85, envMapIntensity: 1.2 });
    const water = new T.Mesh(new T.CylinderGeometry(0.39, 0.34, 1, 48), wm); water.renderOrder = 1; g.add(water);
    const shadow = new T.Mesh(new T.CircleGeometry(0.4, 32), new T.ShadowMaterial({ opacity: 0.15 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; shadow.receiveShadow = true; g.add(shadow);
    let lv = 0.4;
    this.add('story', g, -3.62, 2.45, 0, { ay: 1.6, fd: 0.8, rs: 0.7, anim: (h, t) => { lv += ((0.4 + h * 0.5) - lv) * 0.08; const H = Math.max(0.02, lv * 1.1); water.scale.y = H; water.position.y = 0.08 + H / 2; water.rotation.z = Math.sin(t * 3) * 0.01; } });
  }
  buildMug() {
    const T = this.T, g = new T.Group(), c = this.M(0x0d9488, { r: .45 });
    const body = this.mesh(new T.CylinderGeometry(0.42, 0.38, 0.86, 48), c); body.position.y = 0.43; g.add(body);
    const cof = new T.Mesh(new T.CircleGeometry(0.37, 40), this.M(0x3f2a1d, { r: .3 })); cof.rotation.x = -Math.PI / 2; cof.position.y = 0.8; g.add(cof);
    const hd = this.mesh(new T.TorusGeometry(0.22, 0.06, 12, 28, Math.PI), c); hd.position.set(0.41, 0.45, 0); hd.rotation.z = -Math.PI / 2; g.add(hd);
    g.position.set(0.95, 0, 0.35); g.rotation.y = -0.6; this.scene.add(g);
    this.steam = [0, 1, 2].map(i => { const s = new T.Mesh(new T.PlaneGeometry(0.5, 0.5), new T.MeshBasicMaterial({ map: this.tex.glow, transparent: true, opacity: 0, depthWrite: false })); s.userData.ph = i / 3; this.scene.add(s); return s; });
    this.mug = { g, x: 0.95, z: 0.35, delay: 0.25 + 11 * 0.11 };
  }
  buildEnvelope() {
    const T = this.T, g = new T.Group();
    const body = this.rbox(1.9, 0.05, 1.25, 0.04, this.M(0xfff7ed, { r: .85 })); body.position.y = 0.025; g.add(body);
    const letter = this.rbox(1.6, 0.02, 1.0, 0.02, this.M(0xffffff, { r: .9 })); letter.position.set(0, 0.04, 0); g.add(letter);
    const pv = new T.Group(); pv.position.set(0, 0.056, -0.62); g.add(pv);
    const sh = new T.Shape(); sh.moveTo(-0.95, 0); sh.lineTo(0.95, 0); sh.lineTo(0, -0.78); sh.closePath();
    const fg = new T.ShapeGeometry(sh); fg.rotateX(-Math.PI / 2);
    const flap = this.mesh(fg, new T.MeshStandardMaterial({ color: 0xfde2c8, roughness: .85, side: T.DoubleSide })); pv.add(flap);
    const seal = this.mesh(new T.CylinderGeometry(0.14, 0.14, 0.04, 28), this.M(0xf43f5e, { r: .4 })); seal.position.set(0, 0.02, 0.62); pv.add(seal);
    this.add('apply', g, 4.35, -0.05, 0.28, { ay: 0.9, fd: 0.9, rs: 1.2, anim: (h) => { pv.rotation.x = -h * 2.2; letter.position.z = -h * 0.55; letter.position.y = 0.04 + h * 0.35; letter.rotation.x = h * 0.25; } });
  }

  extent(tgt, dir, d) {
    const T = this.T, c = this._fc || (this._fc = new T.PerspectiveCamera());
    c.fov = this.cam.fov; c.aspect = innerWidth / innerHeight; c.near = .1; c.far = 200; c.clearViewOffset(); c.updateProjectionMatrix();
    c.position.copy(tgt).addScaledVector(dir, d); c.lookAt(tgt); c.updateMatrixWorld();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const v = new T.Vector3();
    const XW = this.compact ? this.COMPACT_X : 7.9, YF = this.compact ? this.COMPACT_YF : -3.4; // [พอร์ต] มือถือ: ช่วงของบนโต๊ะ + หน้าลิ้นชัก
    const YT = this.compact ? 2.2 : 2.5, ZB = this.compact ? -3.5 : -3.9;
    const pts = []; for (const X of [-XW, XW]) { for (const Y of [-0.3, YT]) for (const Z of [ZB, 3.9]) pts.push([X, Y, Z]); pts.push([X, YF, 3.9]); }
    for (const [X, Y, Z] of pts) {
      v.set(X, Y, Z).project(c); const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { w: x1 - x0, h: y1 - y0, cy: (y0 + y1) / 2, y0 };
  }
  homePose() {
    const T = this.T, dir = this.compact ? new T.Vector3(...this.COMPACT_DIR).normalize() : new T.Vector3(0, 8.6, 15).normalize(), tgt = new T.Vector3(0, 0.4, 0);
    const hr = this.heroRef.current, dr = this.dockRef.current;
    // [พอร์ต] เก็บกรอบข้อความบนกระดานไว้ให้ป้ายชื่อหลบ
    if (hr) { this.heroBottom = hr.getBoundingClientRect().bottom; let l = 1e9, r = -1e9, b = -1e9; for (const ch of hr.children) { const q = ch.getBoundingClientRect(); if (q.width < 4 || q.height < 4) continue; l = Math.min(l, q.left); r = Math.max(r, q.right); b = Math.max(b, q.bottom); } this.heroBox = l < r ? { l, r, b } : null; } if (dr) this.dockTop = dr.getBoundingClientRect().top;
    const top = (this.heroBottom || innerHeight * 0.3) + 2, bot = (this.dockTop || innerHeight - 80) + 6;
    const availH = Math.max(150, bot - top), availW = innerWidth - (this.compact ? 8 : 32);
    let d = 22;
    if (innerWidth > 0 && innerHeight > 0) for (let i = 0; i < 4; i++) { const e = this.extent(tgt, dir, d); const f = Math.min(availH / e.h, availW / e.w); if (!Number.isFinite(f) || f <= 0) { d = 22; break; } d = d / f; }
    if (!Number.isFinite(d) || d <= 0) d = 22;
    let e = this.extent(tgt, dir, d); if (!Number.isFinite(e.cy)) e = { cy: innerHeight / 2 };
    // [พอร์ต] มือถือ: ภาพถูกจำกัดด้วยความกว้าง เหลือที่ว่างแนวตั้ง → ชิดโต๊ะขึ้นใต้ข้อความหัวเรื่อง (ที่ว่างไปอยู่พื้นห้องด้านล่างแทน)
    let s = this.compact && Number.isFinite(e.y0) ? top + 14 - e.y0 : (top + bot) / 2 - e.cy; if (!Number.isFinite(s)) s = 0;
    const pose = { t: tgt, p: tgt.clone().addScaledVector(dir, d), s };
    this.homeOk = innerWidth > 0 && innerHeight > 0;
    this._lastHome = pose; this.placeRoom(pose);
    return pose;
  }
  ensureAudio() { if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (this.ac && this.ac.state === 'suspended') this.ac.resume(); if (this.ac && this.state.music && !this.state.muted && !this.mus) setTimeout(() => this.startMusic(), 60); }
  startMusic() {
    if (!this.ac || this.mus || this.state.muted) return; const a = this.ac;
    const g = a.createGain(); g.gain.value = 0.0001; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; const comp = a.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.25; const mk = a.createGain(); mk.gain.value = 1.6; g.connect(lp); lp.connect(comp); comp.connect(mk); mk.connect(a.destination);
    g.gain.linearRampToValueAtTime(1.0, a.currentTime + 2);
    const len = a.sampleRate * 3, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.006 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.5 : 0);
    const cr = a.createBufferSource(); cr.buffer = buf; cr.loop = true; const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; const cg = a.createGain(); cg.gain.value = 0.35; cr.connect(hp); hp.connect(cg); cg.connect(g); cr.start();
    this.mus = { g, cr, next: a.currentTime + 0.15, step: 0 }; setTimeout(() => this.drawDial && this.drawDial(), 30);
    this.musT = setInterval(() => this.schedMusic(), 110);
  }
  stopMusic() {
    if (!this.mus || !this.ac) return; const a = this.ac, m = this.mus; this.mus = null; clearInterval(this.musT); setTimeout(() => this.drawDial && this.drawDial(), 30);
    try { m.g.gain.cancelScheduledValues(a.currentTime); m.g.gain.setValueAtTime(Math.max(0.0001, m.g.gain.value), a.currentTime); m.g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8); } catch (e) {}
    setTimeout(() => { try { m.cr.stop(); m.g.disconnect(); } catch (e) {} }, 1000);
  }
  schedMusic() {
    const a = this.ac, m = this.mus; if (!m || !a) return; const spb = 60 / ((this.STATIONS && this.STATIONS[this.station || 0].bpm) || 74) / 2;
    while (m.next < a.currentTime + 0.5) { this.musStep(m.step, m.next, spb); m.next += spb * (m.step % 2 ? 0.9 : 1.1); m.step++; }
  }
  musStep(s, t, spb) {
    const a = this.ac, m = this.mus, bar = Math.floor(s / 8) % 4, e = s % 8;
    const chords = (this.STATIONS && this.STATIONS[this.station || 0].chords) || [[174.61, 220, 261.63, 329.63], [164.81, 196, 246.94, 293.66], [146.83, 174.61, 220, 261.63], [130.81, 164.81, 196, 246.94]];
    const note = (f, at, dur, vol, type) => { const o = a.createOscillator(), gg = a.createGain(), f2 = a.createBiquadFilter(); o.type = type || 'sine'; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 10; f2.type = 'lowpass'; f2.frequency.value = 1300; gg.gain.setValueAtTime(0.0001, at); gg.gain.linearRampToValueAtTime(vol, at + 0.04); gg.gain.exponentialRampToValueAtTime(0.0001, at + dur); o.connect(f2); f2.connect(gg); gg.connect(m.g); o.start(at); o.stop(at + dur + 0.05); };
    const nz = (at, dur, vol, f, type, q) => { const n = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const sr = a.createBufferSource(); sr.buffer = n; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.8; const gg = a.createGain(); gg.gain.value = vol; sr.connect(fl); fl.connect(gg); gg.connect(m.g); sr.start(at); };
    if (e === 0) { chords[bar].forEach((f, i) => { note(f, t + i * 0.03, spb * 8.4, 0.05); note(f * 2, t + i * 0.03, spb * 2.4, 0.012, 'triangle'); }); note(chords[bar][0] / 2, t, spb * 7, 0.08); }
    if ((e === 3 || e === 6) && Math.random() < 0.45) { const pent = [523.25, 587.33, 659.25, 783.99, 880]; note(pent[Math.floor(Math.random() * 5)], t, spb * 2.2, 0.022, 'sine'); }
    if (e === 0 || e === 5) { const o = a.createOscillator(), gg = a.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18); gg.gain.setValueAtTime(0.32, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(gg); gg.connect(m.g); o.start(t); o.stop(t + 0.25); }
    if (e === 2 || e === 6) nz(t, 0.16, 0.09, 1800, 'bandpass', 0.7);
    nz(t, 0.03, e % 2 ? 0.02 : 0.032, 7500, 'highpass');
  }
  skipIntro() { if (this.introOn && this.tw) this.tw.t = 1; else if (this.state.intro) this.setState({ intro: false }); }
  catTap() {
    if (this.cat && (this.cat.wake || 0) <= 0) { this.cat.wake = 1; this.sfx('meow'); }
  }
  toggleWindow() { this.winOpen = !this.winOpen; this.sfx(this.winOpen ? 'winOpen' : 'winClose'); if (this.winOpen) this._leafT = 0; }
  sfx(kind, pitch) {
    if (this.state.muted || !this.ac || this.ac.state !== 'running') return;
    const a = this.ac, T0 = a.currentTime + 0.005, out = a.createGain(); out.gain.value = 0.9; out.connect(a.destination);
    const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    const tone = (f0, f1, dur, vol, type, at) => { const t = T0 + (at || 0), o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03); };
    const noise = (dur, vol, f, q, at, type, shape, f1) => { const t = T0 + (at || 0), n = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) { const p = i / d.length; d[i] = (Math.random() * 2 - 1) * (shape ? shape(p) : Math.pow(1 - p, 1.5)); } const s = a.createBufferSource(); s.buffer = n; const bp = a.createBiquadFilter(); bp.type = type || 'bandpass'; bp.frequency.setValueAtTime(f, t); if (f1) bp.frequency.exponentialRampToValueAtTime(f1, t + dur); bp.Q.value = q; const g = a.createGain(); g.gain.value = vol; s.connect(bp); bp.connect(g); g.connect(out); s.start(t); };
    const mallet = (f, at, vol) => { tone(f, f, 0.42, vol, 'sine', at); tone(f * 3.98, f * 3.9, 0.07, vol * 0.35, 'sine', at); tone(f * 2, f * 2, 0.18, vol * 0.2, 'triangle', at); };
    const vib = (at, dur) => { const t = T0 + at, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain(); o.type = 'sawtooth'; o.frequency.value = 165; lp.type = 'lowpass'; lp.frequency.value = 320; lfo.frequency.value = 28; lg.gain.value = 0.05; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.02); g.gain.setValueAtTime(0.07, t + dur - 0.03); g.gain.linearRampToValueAtTime(0.0001, t + dur); lfo.connect(lg); lg.connect(g.gain); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + dur + .02); lfo.stop(t + dur + .02); noise(dur, 0.05, 900, 3, at, 'bandpass', (p) => 0.6 + 0.4 * Math.sin(p * 90)); };
    const scribble = (at, n, vol) => { let tt = at; for (let i = 0; i < n; i++) { const d = rnd(0.07, 0.17); noise(d, vol, rnd(3200, 5200), 0.9, tt, 'bandpass', (p) => Math.sin(Math.PI * p) * (0.55 + 0.45 * Math.random()), rnd(2600, 6000)); noise(d, vol * 0.35, 1200, 0.7, tt, 'bandpass', (p) => Math.sin(Math.PI * p)); tt += d + rnd(0.02, 0.07); } };
    const flicks = (at, n, vol, gap) => { let tt = at, gp = gap || 0.05; for (let i = 0; i < n; i++) { noise(0.03, vol * (0.7 + Math.random() * 0.3), rnd(1800, 3200), 1.3, tt, 'bandpass', (p) => Math.pow(1 - p, 2)); tt += gp; gp *= 0.9; } };
    const thud = (at, vol) => { tone(140, 55, 0.18, vol, 'sine', at); noise(0.08, vol * 1.4, 500, 0.7, at, 'lowpass'); };
    const p = pitch || 1;
    switch (kind) {
      case 'hover': tone(1400 * p, 1050 * p, 0.045, 0.022, 'triangle'); break;
      case 'scribble': scribble(0, 3, 0.18); break;
      case 'land': tone(190, 90, 0.09, 0.05 + 0.1 * p, 'sine'); noise(0.05, 0.1 + 0.25 * p, 700, 0.8, 0, 'lowpass'); break;
      case 'courses': thud(0, 0.22); flicks(0.16, 7, 0.28, 0.045); noise(0.3, 0.12, 1600, 0.6, 0.16, 'bandpass', (q) => Math.sin(Math.PI * q)); break;
      case 'mycourse': for (let i = 0; i < 7; i++) { const tt = i * rnd(0.06, 0.11); noise(0.014, 0.35, 3400, 1.5, tt, 'bandpass'); tone(260, 180, 0.03, 0.03, 'sine', tt); } [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, f, 0.55, 0.045, 'sine', 0.72 + i * 0.08)); tone(1046.5, 1046.5, 1, 0.022, 'triangle', 1.05); break;
      case 'exams': noise(0.45, 0.22, 1400, 0.5, 0, 'bandpass', (q) => Math.sin(Math.PI * q) * (0.6 + 0.4 * Math.random())); flicks(0.05, 12, 0.34, 0.04); noise(0.22, 0.3, 2400, 0.8, 0.55, 'bandpass', (q) => Math.sin(Math.PI * q), 3800); thud(0.8, 0.08); break;
      case 'summary': scribble(0, 7, 0.26); tone(2400, 2400, 0.03, 0.02, 'triangle', 0.95); break;
      case 'tips': thud(0, 0.12); noise(0.38, 0.4, 1300, 0.9, 0.12, 'bandpass', (q) => Math.sin(Math.PI * q), 3600); noise(0.05, 0.3, 700, 1, 0.48, 'lowpass'); break;
      case 'countdown': [0, 0.28, 0.56].forEach((at, i) => { tone(i % 2 ? 900 : 1250, i % 2 ? 850 : 1180, 0.05, 0.08, 'triangle', at); noise(0.02, 0.2, i % 2 ? 1800 : 2600, 2, at); }); [1760, 2637, 3520].forEach((f, i) => tone(f, f * 0.998, 1.4 - i * 0.3, 0.05 / (i + 1), 'sine', 0.86)); break;
      case 'reviews': noise(0.26, 0.35, 700, 1.2, 0, 'bandpass', (q) => (0.4 + 0.6 * q) * (0.5 + 0.5 * Math.random()), 4200); noise(0.04, 0.35, 1800, 1, 0.3); tone(210, 120, 0.06, 0.05, 'sine', 0.3); break;
      case 'story': noise(0.7, 0.16, 900, 0.6, 0, 'lowpass', (q) => Math.sin(Math.PI * q)); for (let i = 0; i < 7; i++) { const f = rnd(380, 700), tt = 0.05 + i * rnd(0.07, 0.11); tone(f, f * rnd(1.6, 2.2), 0.06, 0.06, 'sine', tt); } break;
      case 'apply': noise(0.2, 0.18, 2200, 0.8, 0, 'bandpass', (q) => Math.sin(Math.PI * q), 3200); tone(120, 48, 0.2, 0.3, 'sine', 0.22); noise(0.06, 0.55, 1300, 0.7, 0.22, 'lowpass'); noise(0.1, 0.12, 3000, 1, 0.24); mallet(1318.5, 0.5, 0.035); mallet(1760, 0.62, 0.035); break;
      case 'contact': vib(0, 0.3); vib(0.42, 0.3); [[659.3, 0], [784, 0.13], [1046.5, 0.26], [784, 0.52], [880, 0.65], [1046.5, 0.78], [1318.5, 0.91]].forEach(([f, at]) => mallet(f, 0.9 + at, 0.05)); break;
      case 'lamp': noise(0.012, 0.6, 2500, 1, 0); tone(2600, 1800, 0.018, 0.06, 'square', 0); noise(0.012, 0.4, 1900, 1, 0.045); tone(95, 60, 0.12, 0.06, 'sine', 0.05); break;
      case 'kru': tone(520, 780, 0.12, 0.06, 'sine'); tone(780, 1170, 0.14, 0.05, 'sine', 0.11); mallet(1568, 0.24, 0.03); break;
      case 'close': noise(0.32, 0.14, 600, 0.6, 0, 'bandpass', (q) => q * (1 - q) * 4, 1500); tone(640, 420, 0.16, 0.025, 'sine', 0.04); break;
      case 'tab': noise(0.018, 0.3, 2800, 1.4, 0); tone(900, 900, 0.035, 0.025, 'triangle'); break;
      case 'pop': tone(420, 880, 0.14, 0.08); break;
      case 'tune': noise(0.38, 0.22, 700, 2.5, 0, 'bandpass', (q) => 0.6 + 0.4 * Math.sin(q * 70), 3200); tone(1200, 400, 0.3, 0.02, 'sine', 0.02); tone(880, 880, 0.08, 0.04, 'triangle', 0.36); break;
      case 'meow': { const t = T0, o = a.createOscillator(), g2 = a.createGain(), bp = a.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + 0.18); o.frequency.linearRampToValueAtTime(480, t + 0.62); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1800, t + 0.2); bp.frequency.linearRampToValueAtTime(1000, t + 0.6); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.2, t + 0.06); g2.gain.linearRampToValueAtTime(0.16, t + 0.4); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o.connect(bp); bp.connect(g2); g2.connect(out); o.start(t); o.stop(t + 0.75); break; }
      case 'winOpen': noise(0.12, 0.3, 900, 0.8, 0, 'lowpass'); tone(300, 180, 0.12, 0.05, 'sine', 0.02); noise(1.4, 0.18, 600, 0.4, 0.12, 'bandpass', (q) => Math.sin(Math.PI * q), 1600); break;
      case 'winClose': noise(0.08, 0.4, 700, 0.8, 0, 'lowpass'); tone(160, 70, 0.14, 0.12, 'sine', 0.01); break;
      case 'flick': tone(700, 1500, 0.06, 0.05, 'triangle'); noise(0.04, 0.3, 2600, 1); break;
      case 'floor': tone(160, 70, 0.16, 0.08 + 0.12 * p, 'sine'); noise(0.07, 0.2 + 0.3 * p, 900, 0.9, 0, 'lowpass'); noise(0.03, 0.15 * p, 3000, 1.2); break;
      case 'drawer': noise(0.45, 0.5, 380, 0.7, 0, 'lowpass', (q) => Math.sin(Math.PI * q) * (0.7 + 0.3 * Math.sin(q * 90))); tone(95, 55, 0.14, 0.2, 'sine', 0.42); noise(0.05, 0.3, 1800, 1, 0.44); break;
    }
  }
  say(msg, ms) { this.setState({ kruMsg: msg }); this.kruShow = performance.now() / 1000 + (ms || 4.5) / 1000; }
  kruTap() {
    const tips = ['สันหนังสือแต่ละเล่ม คือหมวดคอร์สครับ', 'เรียนต่อ แตะแล็ปท็อปได้เลย', 'กองกระดาษนั่นคือคลังข้อสอบนะ', 'โพสต์อิท คือเสียงจากน้องๆ และผู้ปกครอง', 'มีคำถาม แตะโทรศัพท์ทักครูได้เลย', 'ลองกดโคมไฟ ห้องจะเป็นกลางคืน'];
    this.say('ครูฮีมเองครับ', 3200); this.sfx('kru');
  }
  buildKru() {
    const T = this.T, g = new T.Group(), pivot = new T.Group(); g.add(pivot);
    const PW = 1, PH = 1.36;
    const paper = this.rbox(PW, 0.02, PH, 0.02, this.M(0xfffdf7, { r: .85 })); paper.rotation.x = Math.PI / 2; paper.castShadow = true; pivot.add(paper);
    const cvs = document.createElement('canvas'); cvs.width = 600; cvs.height = 816;
    const tex = new T.CanvasTexture(cvs); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
    const draw = (img) => {
      const x = cvs.getContext('2d'), w = 600, hh = 816, F = "'Mitr', sans-serif", B = "'IBM Plex Sans Thai Looped', sans-serif";
      x.clearRect(0, 0, w, hh);
      const gr = x.createLinearGradient(0, 0, w, 620); gr.addColorStop(0, '#22d3ee'); gr.addColorStop(.55, '#14b8a6'); gr.addColorStop(1, '#6366f1'); x.fillStyle = gr; x.fillRect(0, 0, w, 620);
      const sun = x.createRadialGradient(300, 330, 20, 300, 330, 300); sun.addColorStop(0, 'rgba(254,240,138,.95)'); sun.addColorStop(.5, 'rgba(251,191,36,.45)'); sun.addColorStop(1, 'rgba(251,191,36,0)'); x.fillStyle = sun; x.fillRect(0, 0, w, 620);
      x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 5; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; x.beginPath(); x.moveTo(300, 330); x.lineTo(300 + Math.cos(a) * 600, 330 + Math.sin(a) * 600); x.stroke(); }
      x.font = `600 70px ${F}`; [['π', 40, 96, '#fde047'], ['÷', 495, 122, '#fb7185'], ['√', 470, 560, '#fde047'], ['+', 56, 540, '#f472b6'], ['×', 520, 330, '#a7f3d0']].forEach(([s, sx, sy, c]) => { x.fillStyle = c; x.fillText(s, sx, sy); });
      [[120, 190, 10, '#fde047'], [480, 230, 8, '#fff'], [90, 400, 7, '#fff'], [520, 470, 9, '#fb7185']].forEach(([sx, sy, r, c]) => { x.fillStyle = c; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r * 1.6; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } x.fill(); });
      if (img) { const iw = 600, ih = iw * 1024 / 977; x.drawImage(img, (w - iw) / 2, 620 - ih + 44, iw, ih); }
      const bb = x.createLinearGradient(0, 620, w, 816); bb.addColorStop(0, '#fbbf24'); bb.addColorStop(1, '#f97316'); x.fillStyle = bb; x.fillRect(0, 620, w, 196); x.fillStyle = '#ef4444'; x.fillRect(0, 620, w, 10);
      x.fillStyle = '#0f172a'; x.font = `600 92px ${F}`; x.textAlign = 'center'; x.fillText('ครูฮีม', w / 2, 722);
      x.font = `700 26px ${B}`; x.fillStyle = '#7c2d12'; x.fillText('KRUHEEM MATH SCHOOL', w / 2, 772);
      tex.needsUpdate = true;
    };
    draw(null); const img = new Image(); img.onload = () => draw(img); img.src = '/assets/kruheem_avatar.png';
    if (document.fonts) document.fonts.ready.then(() => img.complete && draw(img));
    const mat = this.kruMat = new T.MeshBasicMaterial({ map: tex, toneMapped: false });
    const card = new T.Mesh(new T.PlaneGeometry(PW - 0.08, (PW - 0.08) * 816 / 600), mat); card.position.z = 0.012; pivot.add(card);
    const tapeM = new T.MeshStandardMaterial({ color: 0xfef3c7, roughness: .9, transparent: true, opacity: .82 });
    [[-0.42, PH / 2 - 0.02, 0.6], [0.42, PH / 2 - 0.02, -0.6], [-0.42, -PH / 2 + 0.02, -0.6], [0.42, -PH / 2 + 0.02, 0.6]].forEach(([tx, ty, rz]) => { const tp = new T.Mesh(new T.PlaneGeometry(0.34, 0.1), tapeM); tp.position.set(tx, ty, 0.02); tp.rotation.z = rz; pivot.add(tp); });
    [paper, card].forEach(m => { m.userData.key = 'kru'; this.hitList.push(m); });
    this.scene.add(g); g.position.set(-5, 3, this.ZW + 0.3);
    this.kru = { g, pivot, card, PW, PH };
  }
  buildProps() {
    const T = this.T; this.props3 = [];
    const mk = (g, x, z, yaw, r) => { const o = { g, home: new T.Vector3(x, r, z), yaw0: yaw, pos: new T.Vector3(x, r, z), vel: new T.Vector3(), q: new T.Quaternion().setFromEuler(new T.Euler(0, yaw, 0)), w: new T.Vector3(), state: 'rest', t: 0, r, s: 1 }; g.position.copy(o.pos); g.quaternion.copy(o.q); this.scene.add(g); const i = this.props3.length; g.traverse(n => { if (n.isMesh) { n.userData.key = 'prop'; n.userData.prop = i; this.hitList.push(n); } }); this.props3.push(o); };
    const e = new T.Group(); e.add(this.rbox(0.62, 0.18, 0.3, 0.05, this.M(0xfda4af, { r: .8 }))); const es = this.rbox(0.4, 0.19, 0.32, 0.02, this.M(0x0ea5e9, { r: .4 })); es.position.x = 0.08; e.add(es); mk(e, 0.72, 3.38, 0.35, 0.09);
    mk(this.pencil(1.5), -2.4, 3.5, 0.08, 0.07);
    const s = new T.Group(); s.add(this.rbox(0.36, 0.26, 0.3, 0.05, this.M(0xf43f5e, { r: .35 }))); const sh = this.mesh(new T.CylinderGeometry(0.07, 0.07, 0.06, 20), this.M(0x475569, { r: .3, m: .6 })); sh.rotation.x = Math.PI / 2; sh.position.set(0, 0.02, 0.17); s.add(sh); mk(s, 3.35, 3.38, -0.4, 0.13);
    const be = new T.Group(); const bt = this.rbox(0.92, 0.2, 0.34, 0.06, this.M(0xc8a27a, { r: .55 })); bt.position.y = 0.05; be.add(bt); const fl = this.rbox(0.9, 0.09, 0.32, 0.02, this.M(0x475569, { r: .95 })); fl.position.y = -0.1; be.add(fl);
    const bl = new T.Mesh(new T.PlaneGeometry(0.6, 0.1), this.M(0x0f766e, { r: .6 })); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.152; be.add(bl);
    mk(be, 0, 0, 0, 0.145); this.props3[this.props3.length - 1].tray = true;
    [0xffffff, 0xfde68a, 0xf9a8d4, 0x93c5fd, 0x86efac].forEach(c => { const w = new T.Group(), ch = this.mesh(new T.CapsuleGeometry(0.045, 0.4, 4, 12), this.M(c, { r: .95 })); ch.rotation.z = Math.PI / 2; w.add(ch); mk(w, 0, 0, 0, 0.045); this.props3[this.props3.length - 1].tray = true; });
    const hl = (body, cap, x, z, yaw) => { const g = new T.Group();
      const bd = this.rbox(0.95, 0.2, 0.26, 0.09, this.M(body, { r: .35 })); g.add(bd);
      const cp = this.rbox(0.36, 0.23, 0.29, 0.09, this.M(cap, { r: .3 })); cp.position.x = 0.62; g.add(cp);
      const clip = this.rbox(0.26, 0.04, 0.06, 0.02, this.M(cap, { r: .3 })); clip.position.set(0.6, 0.13, 0.1); g.add(clip);
      const end = this.rbox(0.1, 0.17, 0.22, 0.05, this.M(cap, { r: .3 })); end.position.x = -0.5; g.add(end);
      const lb = new T.Mesh(new T.PlaneGeometry(0.5, 0.12), this.M(0xffffff, { r: .6 })); lb.rotation.x = -Math.PI / 2; lb.position.set(-0.05, 0.102, 0); g.add(lb);
      mk(g, x, z, yaw, 0.1); };
    hl(0xfde047, 0xca8a04, -0.45, 3.52, -0.12);
    hl(0xf9a8d4, 0xdb2777, 2.2, 3.5, 0.2);
  }
  flick(i, pt) {
    const o = this.props3 && this.props3[i]; if (!o || o.state === 'respawn') return;
    if (o.tray && o.pos.z < -3.8) { o.vel.set((Math.random() - .5) * 2.4, 4 + Math.random(), 4.6 + Math.random() * 1.2); o.mustFall = true; } else this.aimOff(o, pt);
    o.w.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(9 + Math.random() * 6);
    o.state = 'fly'; o.back = false; this.ensureAudio(); this.sfx('flick');
  }
  freeSpot(self) {
    const T = this.T;
    if (!this._foot || performance.now() - this._footT > 4000) {
      this._footT = performance.now(); this._foot = [];
      for (const it of this.order) { if (it.static || !it.g || !it.g.visible) continue; const b = new T.Box3().setFromObject(it.g); if (!b.isEmpty()) this._foot.push(b); }
      if (this.kru && this.kru.g && this.kru.g.position.z > -3.8) this._foot.push(new T.Box3().setFromObject(this.kru.g));
    }
    const hit = (x, z) => this._foot.some(b => x > b.min.x - 0.35 && x < b.max.x + 0.35 && z > b.min.z - 0.35 && z < b.max.z + 0.35 && b.min.y < 0.8)
      || this.props3.some(o => o !== self && !o.tray && Math.hypot(o.pos.x - x, o.pos.z - z) < 0.9 && o.pos.y > -0.5);
    const hp = this._lastHome, c = this._vc || (this._vc = new T.PerspectiveCamera()), rc = this._vrc || (this._vrc = new T.Raycaster());
    if (hp) { c.fov = this.cam.fov; c.aspect = innerWidth / innerHeight; c.near = .1; c.far = 200; c.position.copy(hp.p); c.lookAt(hp.t); c.setViewOffset(innerWidth, innerHeight, 0, -(hp.s || 0), innerWidth, innerHeight); c.updateProjectionMatrix(); c.updateMatrixWorld(); }
    const dock = this.dockRef && this.dockRef.current ? this.dockRef.current.getBoundingClientRect().top : innerHeight - 80, hero = (this.heroBottom || 0) + 10;
    const occluders = this.hitList.filter(m => m.userData.prop === undefined || m.userData.prop !== this.props3.indexOf(self));
    const visible = (x, z) => {
      if (!hp) return true;
      const pts = [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.25], [0, -0.25]];
      for (const [ox, oz] of pts) {
        const p = new T.Vector3(x + ox, self.r + 0.02, z + oz), v = p.clone().project(c), sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
        if (sx < 30 || sx > innerWidth - 30 || sy < hero || sy > dock - 12) return false;
        rc.setFromCamera(new T.Vector2(v.x, v.y), c); const hh = rc.intersectObjects(occluders, false)[0];
        if (hh && hh.distance < c.position.distanceTo(p) - 0.15) return false;
      }
      return true;
    };
    for (let i = 0; i < 90; i++) { const x = (Math.random() * 2 - 1) * 5.5, z = 0.2 + Math.random() * 3.35; if (!hit(x, z) && visible(x, z)) return { x, z }; }
    return { x: self.home.x, z: self.home.z };
  }
  placeTrayProps(c, len) {
    if (!this.props3) return; const tr = this.props3.filter(o => o.tray);
    tr.forEach((o, i) => {
      const x = i === 0 ? c.x - len * 0.3 : Math.max(c.x + len * 0.16, 2.6) + (i - 1) * Math.max(0.55, len * 0.055) + (i % 2 ? 0.04 : -0.03), yaw = i === 0 ? 0 : (i % 2 ? 0.06 : -0.05);
      o.home.set(x, c.y + o.r, c.z + (i === 0 ? 0 : (i % 2 ? 0.05 : -0.05))); o.yaw0 = yaw;
      if (o.state === 'rest') { o.pos.copy(o.home); o.q.setFromEuler(new this.T.Euler(0, yaw, 0)); o.g.position.copy(o.pos); o.g.quaternion.copy(o.q); }
    });
  }
  aimOff(o, pt) {
    const x = o.pos.x, z = o.pos.z, dF = 3.75 - z, dL = x + 6.25, dR = 6.25 - x;
    let dir;
    if (dF <= Math.min(dL, dR) * 1.4) dir = [pt ? Math.max(-0.5, Math.min(0.5, (x - pt.x) * 0.8)) : (Math.random() - .5) * 0.5, 1];
    else dir = [dL < dR ? -1 : 1, (Math.random() - .3) * 0.4];
    const n = Math.hypot(dir[0], dir[1]); dir = [dir[0] / n, dir[1] / n];
    const dist = dir[1] > 0.6 ? dF / dir[1] : (dir[0] < 0 ? dL : dR) / Math.abs(dir[0]);
    const vy = 5 + Math.random() * 1.2, T = 2 * vy / 22, sp = Math.min(14, (dist + 0.9 + Math.random() * 0.8) / T);
    o.vel.set(dir[0] * sp, vy, dir[1] * sp); o.mustFall = true;
  }
  stepProps(dt, now) {
    if (!this.props3) return; const T = this.T, st = Math.min(dt, 1 / 30);
    for (const o of this.props3) {
      if (o.state === 'rest') continue;
      if (o.state === 'floor' && now - o.t > 3.2) { o.state = 'respawn'; o.t = now; }
      if (o.state === 'respawn') { const k = (now - o.t) / 0.35; o.s = Math.max(0.001, 1 - k); if (k >= 1) { const sp = o.tray ? { x: o.home.x, z: o.home.z } : this.freeSpot(o); o.pos.set(sp.x, (o.tray ? o.home.y + 1.6 : o.r + 3.2), sp.z); o.vel.set(0, 0, 0); o.w.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(4); o.q.setFromEuler(new T.Euler(o.tray ? 0.2 : 0.5, o.tray ? o.yaw0 : Math.random() * Math.PI * 2, o.tray ? 0.15 : 0.3)); o.state = 'fly'; o.s = 1; o.back = true; } }
      if (o.state === 'fly') {
        o.vel.y -= 22 * st; o.pos.addScaledVector(o.vel, st);
        const wl = o.w.length(); if (wl > 1e-4) o.q.premultiply(new T.Quaternion().setFromAxisAngle(o.w.clone().multiplyScalar(1 / wl), wl * st));
        const onTray = o.tray && o.back && Math.abs(o.pos.x - o.home.x) < 0.7 && Math.abs(o.pos.z - o.home.z) < 0.35 && o.pos.y > o.home.y - 0.3;
        const onDesk = !onTray && o.pos.y > -0.35 && Math.abs(o.pos.x) < 6.25 && Math.abs(o.pos.z) < 3.75, gy = onTray ? o.home.y : onDesk ? o.r : this.FY + o.r;
        if (o.pos.y < gy) {
          o.pos.y = gy;
          if (onDesk && o.mustFall && !o.back) { this.aimOff(o, null); o.vel.y *= 0.7; this.sfx('land', 0.5); continue; }
          if (o.vel.y < -1.4) { const imp = -o.vel.y; o.vel.y = imp * 0.36; o.vel.x *= 0.72; o.vel.z *= 0.72; o.w.multiplyScalar(0.65); this.sfx(onDesk ? 'land' : 'floor', Math.min(1, imp * 0.12)); }
          else {
            o.vel.y = 0; const f = Math.pow(0.04, st); o.vel.x *= f; o.vel.z *= f; o.w.multiplyScalar(Math.pow(0.02, st));
            const eu = new T.Euler().setFromQuaternion(o.q, 'YXZ'), flat = new T.Quaternion().setFromEuler(new T.Euler(0, onTray ? o.yaw0 : eu.y, 0, 'YXZ')); o.q.slerp(flat, Math.min(1, st * 10));
            if (Math.hypot(o.vel.x, o.vel.z) < 0.05 && o.w.length() < 0.25) { o.q.copy(flat); o.w.set(0, 0, 0); if (onTray) { o.state = 'rest'; o.back = false; o.pos.copy(o.home); o.q.setFromEuler(new T.Euler(0, o.yaw0, 0)); } else if (onDesk) { o.state = 'rest'; o.mustFall = false; } else { o.state = 'floor'; o.t = now; o.mustFall = false; } }
          }
        }
      }
      o.g.position.copy(o.pos); o.g.quaternion.copy(o.q); o.g.scale.setScalar(o.s);
    }
  }
  buildCat() {
    const T = this.T, g = new T.Group(), fur = new T.MeshPhysicalMaterial({ color: 0x141213, roughness: .62, sheen: 1, sheenColor: new T.Color(0x8b8fa8), sheenRoughness: .45, envMapIntensity: .5 }), furD = fur, cream = fur, dark = this.M(0x8a8580, { r: .5 }), pink = this.M(0x3f2a2e, { r: .5 }), white = this.M(0xf5f5f4, { r: .3 });
    const S = (r, m, sx, sy, sz, x, y, z, par) => { const o = this.mesh(new T.SphereGeometry(r, 28, 20), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); (par || g).add(o); return o; };
    const bodyG = new T.Group(); g.add(bodyG);
    const body = S(0.5, fur, 1.1, 0.52, 0.78, 0, 0.26, 0, bodyG);
    S(0.34, fur, 1, 0.82, 1, -0.34, 0.24, -0.04, bodyG);
    S(0.3, cream, 0.9, 0.66, 0.8, 0.3, 0.19, 0.17, bodyG);
    
    S(0.09, cream, 1.4, 0.55, 0.9, 0.62, 0.06, 0.34, bodyG); S(0.09, cream, 1.4, 0.55, 0.9, 0.5, 0.055, 0.42, bodyG);
    const headG = new T.Group(); headG.position.set(0.52, 0.27, 0.28); g.add(headG);
    S(0.26, fur, 1.06, 0.9, 0.95, 0, 0, 0, headG);
    [-1, 1].forEach(sd => S(0.13, fur, 1, 0.85, 0.9, sd * 0.13, -0.07, 0.1, headG));
    S(0.1, cream, 1.35, 0.8, 0.8, 0, -0.08, 0.2, headG);
    S(0.028, pink, 1.3, 0.8, 0.8, 0, -0.035, 0.27, headG);
    [-1, 1].forEach(sd => { const ear = this.mesh(new T.ConeGeometry(0.105, 0.24, 3), fur); ear.position.set(sd * 0.14, 0.21, -0.02); ear.rotation.set(-0.15, sd * 0.5, -sd * 0.28); headG.add(ear); const ie = this.mesh(new T.ConeGeometry(0.06, 0.15, 3), pink); ie.position.set(sd * 0.14, 0.2, 0.02); ie.rotation.set(-0.15, sd * 0.5, -sd * 0.28); headG.add(ie); });
    const eyesC = [], eyesO = [];
    [-1, 1].forEach(sd => {
      const c = this.mesh(new T.TorusGeometry(0.042, 0.011, 6, 14, Math.PI), dark); c.position.set(sd * 0.1, 0.035, 0.235); c.rotation.set(0, 0, Math.PI); headG.add(c); eyesC.push(c);
      const eo = new T.Group(); eo.position.set(sd * 0.1, 0.04, 0.225); const ball = new T.Mesh(new T.SphereGeometry(0.047, 16, 12), new T.MeshStandardMaterial({ color: 0xeab308, emissive: 0x854d0e, emissiveIntensity: .35, roughness: .15 })); eo.add(ball); const pu = this.mesh(new T.SphereGeometry(0.03, 12, 10), this.M(0x0a0a0a, { r: .2 })); pu.scale.set(0.45, 1, 0.6); pu.position.z = 0.025; eo.add(pu); const hl = this.mesh(new T.SphereGeometry(0.009, 8, 6), white); hl.position.set(0.012, 0.015, 0.04); eo.add(hl); eo.visible = false; headG.add(eo); eyesO.push(eo);
      for (let k = 0; k < 3; k++) { const wk = this.mesh(new T.CylinderGeometry(0.003, 0.003, 0.24, 4), white); wk.rotation.z = Math.PI / 2 + (k - 1) * 0.18 * sd; wk.position.set(sd * 0.2, -0.07 + (k - 1) * 0.02, 0.2); headG.add(wk); }
    });
    const tail = []; for (let i = 0; i < 22; i++) { const r = 0.078 * (1 - i / 30); const m = this.mesh(new T.SphereGeometry(r, 12, 10), fur); g.add(m); tail.push(m); }
    const zs = [0, 1, 2].map(() => { const cv = this.cv(64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.font = "700 48px 'Mitr', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 32, 34); }); const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false })); sp.scale.setScalar(0.22); g.add(sp); return sp; });
    const tailSet = new Set(tail);
    g.traverse(n => { if (n.isMesh && !tailSet.has(n)) { n.userData.key = 'cat'; this.hitList.push(n); } });
    g.position.set(-8, 0, -4); g.scale.setScalar(0.78); this.scene.add(g);
    this.cat = { g, body, bodyG, headG, tail, eyesC, eyesO, zs, wake: 0 };
  }
  buildSideTable() {
    const T = this.T, S = this.scene, top = -1.25, X = -7.25, Z = -0.55, wood = this.deskMat, wood2 = this.deskMat2 || wood;
    const mkTable = (TX) => {
      const tt = this.rbox(1.7, 0.16, 1.7, 0.08, wood); tt.position.set(TX, top - 0.08, Z); tt.castShadow = true; S.add(tt);
      [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]].forEach(([dx, dz]) => { const lg = this.rbox(0.12, top - 0.16 - this.FY, 0.12, 0.03, wood2); lg.position.set(TX + dx, top - 0.16 - (top - 0.16 - this.FY) / 2, Z + dz); S.add(lg); });
      const shelf = this.rbox(1.5, 0.08, 1.5, 0.03, wood2); shelf.position.set(TX, (top + this.FY) / 2 - 0.5, Z); S.add(shelf);
    };
    mkTable(X); mkTable(-X);
    if (this.cat) { this.cat.g.position.set(-X - 0.05, top, Z + 0.05); this.cat.g.rotation.y = -0.45; this.cat.g.scale.setScalar(0.9); this._catOnTable = true; }
    this.STATIONS = [
      { name: 'Chill Study', fm: 89.5, bpm: 74, chords: [[174.61, 220, 261.63, 329.63], [164.81, 196, 246.94, 293.66], [146.83, 174.61, 220, 261.63], [130.81, 164.81, 196, 246.94]] },
      { name: 'Rainy Night', fm: 96.25, bpm: 64, chords: [[110, 196, 261.63, 329.63], [87.31, 220, 261.63, 329.63], [130.81, 196, 246.94, 329.63], [98, 196, 246.94, 293.66]] },
      { name: 'Morning Focus', fm: 103.75, bpm: 84, chords: [[146.83, 220, 277.18, 369.99], [123.47, 220, 293.66, 369.99], [98, 246.94, 293.66, 369.99], [110, 220, 277.18, 392]] },
      { name: 'Sunset Drive', fm: 107.5, bpm: 70, chords: [[155.56, 196, 233.08, 293.66], [130.81, 155.56, 196, 233.08], [103.83, 196, 261.63, 311.13], [116.54, 174.61, 233.08, 293.66]] }
    ];
    this.STATIONS.length = 1; this.station = 0;
    this.station = this.station || 0;
    const rg = new T.Group(); rg.position.set(X + 0.02, top, Z + 0.05); rg.rotation.y = 0.35; S.add(rg);
    const body = this.rbox(1.36, 0.8, 0.56, 0.14, this.M(0x0f766e, { r: .45 })); body.position.y = 0.4; rg.add(body);
    const face = this.rbox(1.22, 0.64, 0.04, 0.08, this.M(0xf5ecd7, { r: .7 })); face.position.set(0, 0.4, 0.28); rg.add(face);
    this.tx('grille', this.cv(256, 256, (x) => { x.fillStyle = '#e7dcc4'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.fillStyle = '#6b5b45'; for (let yy = 16; yy < 256; yy += 22) for (let xx = 16 + ((yy / 22) % 2) * 11; xx < 256; xx += 22) { if (Math.hypot(xx - 128, yy - 128) < 110) { x.beginPath(); x.arc(xx, yy, 6, 0, 7); x.fill(); } } }));
    const spk = new T.Mesh(new T.CircleGeometry(0.24, 48), new T.MeshStandardMaterial({ map: this.tex.grille, roughness: .8 })); spk.position.set(-0.3, 0.4, 0.305); rg.add(spk);
    const ring = this.mesh(new T.TorusGeometry(0.245, 0.02, 10, 48), this.M(0xc8a27a, { r: .3, m: .4 })); ring.position.set(-0.3, 0.4, 0.305); rg.add(ring);
    this.tx('radioDial', this.cv(512, 200, () => {}));
    const dial = new T.Mesh(new T.PlaneGeometry(0.5, 0.2), new T.MeshBasicMaterial({ map: this.tex.radioDial, toneMapped: false })); dial.position.set(0.28, 0.52, 0.305); rg.add(dial);
    const knobM = this.M(0x7c5334, { r: .4 });
    const mkKnob = (x, key) => { const k = this.mesh(new T.CylinderGeometry(0.065, 0.07, 0.07, 24), knobM); k.rotation.x = Math.PI / 2; k.position.set(x, 0.27, 0.32); rg.add(k); const mark = this.mesh(new T.BoxGeometry(0.012, 0.05, 0.01), this.M(0xfbbf24)); mark.position.set(0, 0.036, 0.02); mark.rotation.x = -Math.PI / 2; k.add(mark); k.userData.key = key; this.hitList.push(k); return k; };
    const kPlay = mkKnob(0.15, 'radioPlay'), kNext = mkKnob(0.42, 'radioNext');
    const lbl = (txt, x) => { const cv = this.cv(128, 40, (c) => { c.clearRect(0, 0, 128, 40); c.fillStyle = '#6b5b45'; c.font = "700 22px 'IBM Plex Sans Thai Looped', sans-serif"; c.textAlign = 'center'; c.fillText(txt, 64, 28); }); const m = new T.Mesh(new T.PlaneGeometry(0.2, 0.0625), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false })); m.position.set(x, 0.17, 0.302); rg.add(m); };
    lbl('เปิด/ปิด', 0.15);
    const hd = this.mesh(new T.TorusGeometry(0.42, 0.04, 10, 36, Math.PI), this.M(0x1e293b, { r: .35, m: .3 })); hd.position.set(0, 0.8, 0); rg.add(hd);
    const ant = this.mesh(new T.CylinderGeometry(0.012, 0.012, 1.1, 8), this.M(0xd6d3d1, { r: .2, m: .9 })); ant.position.set(0.52, 1.25, -0.12); ant.rotation.z = -0.35; rg.add(ant);
    const tipB = this.mesh(new T.SphereGeometry(0.035, 12, 10), this.M(0xd6d3d1, { r: .2, m: .9 })); tipB.position.set(0.71, 1.77, -0.12); rg.add(tipB);
    const led = new T.Mesh(new T.CircleGeometry(0.025, 16), new T.MeshBasicMaterial({ color: 0x334155, toneMapped: false })); led.position.set(0.55, 0.42, 0.306); rg.add(led);
    [body, face, spk, ring, dial, hd].forEach(m => { m.userData.key = 'radio'; this.hitList.push(m); });
    const notes = [0, 1, 2].map(i => { const cv = this.cv(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.fillStyle = ['#fbbf24', '#5eead4', '#f9a8d4'][i]; c.font = "700 50px sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i === 1 ? '♫' : '♪', 32, 34); }); const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false })); sp.scale.setScalar(0.28); rg.add(sp); return sp; });
    this.radio = { rg, spk, ring, led, kPlay, kNext, notes, press: 0, pressK: null };
    const mk = (k) => { this.items[k] = { k, static: true, g: rg, x: X, z: Z + 0.3, ay: top + 1.1, h: 0, v: 0, rotY: 0, rs: 0.001 }; };
    mk('radio'); mk('radioPlay'); mk('radioNext');
    this.drawDial();
  }
  drawDial() {
    if (!this.tex || !this.STATIONS || !this.tex.radioDial) return; // [พอร์ต] โหมดไม่มี 3D ไม่มีหน้าปัด
    const tex = this.tex.radioDial; if (!tex) return; const x = tex.image.getContext('2d'), w = 512, hh = 200, st = this.STATIONS[this.station], on = !!this.mus;
    x.fillStyle = on ? '#3b2a12' : '#2a2320'; x.fillRect(0, 0, w, hh);
    const g = x.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, on ? 'rgba(251,191,36,.35)' : 'rgba(251,191,36,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, hh);
    x.strokeStyle = '#fde68a'; x.fillStyle = '#fde68a'; x.lineWidth = 2; x.font = "600 18px 'IBM Plex Sans Thai Looped', sans-serif"; x.textAlign = 'center';
    for (let f = 88; f <= 108; f++) { const px = 30 + (f - 88) / 20 * (w - 60), big = f % 4 === 0; x.beginPath(); x.moveTo(px, 118); x.lineTo(px, big ? 96 : 106); x.stroke(); if (big) x.fillText(String(f), px, 144); }
    const nx = 30 + (st.fm - 88) / 20 * (w - 60); x.strokeStyle = '#ef4444'; x.lineWidth = 5; x.beginPath(); x.moveTo(nx, 84); x.lineTo(nx, 160); x.stroke();
    x.fillStyle = on ? '#fef3c7' : '#a8a29e'; x.font = "600 34px 'Mitr', sans-serif"; x.fillText((on ? '♪ ' : '') + st.name, w / 2, 56);
    x.font = "700 20px 'IBM Plex Sans Thai Looped', sans-serif"; x.fillStyle = on ? '#fbbf24' : '#78716c'; x.fillText(st.fm.toFixed(2) + ' FM  ·  ' + (on ? 'ON AIR' : 'OFF'), w / 2, 186);
    tex.needsUpdate = true;
  }
  pickStation(i) {
    this.ensureAudio(); if (i === this.station && this.mus) return; this.station = i; this.setState({ station: i }); this.sfx('tune');
    if (!this.mus) { this.setState({ music: true }); try { localStorage.setItem('kh_desk_music', '1'); } catch (e) {} if (this.state.muted) this.setState({ muted: false }); setTimeout(() => this.startMusic(), 380); }
    setTimeout(() => this.drawDial(), 420);
  }
  radioAction(key) {
    this.ensureAudio(); const r = this.radio;
    key = 'radioPlay';
    if (r) { r.press = 1; r.pressK = r.kPlay; }
    if (key === 'radioNext') { this.station = (this.station + 1) % this.STATIONS.length; this.setState({ station: this.station }); this.sfx('tune'); if (!this.state.music || !this.mus) { this.setState({ music: true }); try { localStorage.setItem('kh_desk_music', '1'); } catch (e) {} if (this.state.muted) this.setState({ muted: false }); setTimeout(() => this.startMusic(), 380); } }
    else { const on = !this.mus; this.sfx('click'); this.setState({ music: on }); try { localStorage.setItem('kh_desk_music', on ? '1' : '0'); } catch (e) {} if (on) { if (this.state.muted) this.setState({ muted: false }); setTimeout(() => this.startMusic(), 60); } else this.stopMusic(); }
    setTimeout(() => this.drawDial(), 450);
  }
  buildLeaves() {
    const T = this.T; this.leaves = [];
    const cols = ['#65a30d', '#84cc16', '#f59e0b', '#ea580c', '#16a34a'];
    const texs = cols.map(c => { const cv = this.cv(64, 40, (x) => { x.clearRect(0, 0, 64, 40); x.fillStyle = c; x.beginPath(); x.ellipse(32, 20, 28, 14, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(6, 20); x.lineTo(58, 20); x.stroke(); }); const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; return t; });
    for (let i = 0; i < 18; i++) {
      const paper = i % 6 === 5, m = new T.Mesh(new T.PlaneGeometry(paper ? 0.34 : 0.26, paper ? 0.44 : 0.16), new T.MeshStandardMaterial(paper ? { color: 0xffffff, roughness: .9, side: T.DoubleSide, transparent: true } : { map: texs[i % texs.length], roughness: .8, side: T.DoubleSide, transparent: true, alphaTest: 0.05 }));
      m.castShadow = true; m.visible = false; this.scene.add(m); this.leaves.push({ m, on: false, v: new T.Vector3(), w: new T.Vector3(), life: 0, ph: 0, rest: false });
    }
  }
  spawnLeaf() {
    if (!this.leaves || !this.win) return; const L = this.leaves.find(l => !l.on); if (!L) return; const T = this.T, wp = this.win.position, ww = this._winW || 3, wh = this._winH || 4;
    L.on = true; L.rest = false; L.life = 7; L.ph = Math.random() * 6; L.m.visible = true; L.m.material.opacity = 1;
    L.m.position.set(wp.x + (Math.random() - .5) * ww * 0.7, wp.y + (Math.random() - .1) * wh * 0.4, wp.z + 0.4);
    L.v.set(1.2 + Math.random() * 1.6, -0.2 + Math.random() * 0.6, 2.2 + Math.random() * 1.8); L.w.set(Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 4 - 2);
    L.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  }
  stepRoomFx(dt, t, now) {
    const T = this.T;
    const wtg = this.winOpen ? 1 : 0; this.winA = (this.winA || 0) + (wtg - (this.winA || 0)) * Math.min(1, dt * 3);
    if (this.sashes) { const e = this.winA; this.sashes[0].rotation.y = 1.2 * e; this.sashes[1].rotation.y = -1.2 * e; }
    const wind = 0.25 + this.winA * (0.9 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 2.3));
    if (this.curtains) for (const c of this.curtains) {
      const pa = c.m.geometry.attributes.position, arr = pa.array, b = c.base, H = c.H;
      for (let i = 0; i < arr.length; i += 3) { const x = b[i], y = b[i + 1], ny = Math.max(0, (H / 2 - y) / H); arr[i] = x + Math.sin(t * 1.3 + y * 2 + c.ph) * 0.03 * ny * wind * c.side; arr[i + 2] = b[i + 2] + Math.sin(t * 1.7 + y * 1.3 + x * 3 + c.ph) * 0.07 * ny * (0.5 + wind) + this.winA * ny * ny * 0.55 * (0.6 + 0.4 * Math.sin(t * 1.1 + c.ph)); }
      pa.needsUpdate = true; c.m.geometry.computeVertexNormals();
    }
    if (this.winOpen) { this._leafT = (this._leafT || 0) - dt; if (this._leafT <= 0) { this._leafT = 0.35 + Math.random() * 0.8; this.spawnLeaf(); if (Math.random() < .4) this.spawnLeaf(); } }
    if (this.leaves) for (const L of this.leaves) {
      if (!L.on) continue; L.life -= dt; const p = L.m.position;
      if (!L.rest) {
        L.v.y -= 1.4 * dt; L.v.y = Math.max(L.v.y, -1.1); L.v.x *= Math.pow(0.6, dt); L.v.z *= Math.pow(0.6, dt);
        p.addScaledVector(L.v, dt); p.x += Math.sin(t * 3 + L.ph) * 0.7 * dt; p.z += Math.cos(t * 2.3 + L.ph) * 0.35 * dt;
        L.m.rotation.x += L.w.x * dt; L.m.rotation.y += L.w.y * dt; L.m.rotation.z += L.w.z * dt;
        const onDesk = Math.abs(p.x) < 6.2 && Math.abs(p.z) < 3.7 && p.y > -0.3, gy = onDesk ? 0.02 : this.FY + 0.02;
        if (p.y < gy) { p.y = gy; L.rest = true; L.m.rotation.set(-Math.PI / 2, 0, Math.random() * 6); L.life = Math.min(L.life, 3); }
      }
      if (L.life < 1) L.m.material.opacity = Math.max(0, L.life);
      if (L.life <= 0) { L.on = false; L.m.visible = false; }
    }
    if (!this._sunT || now - this._sunT > 1) {
      this._sunT = now; const d = new Date(), hr = d.getHours() + d.getMinutes() / 60, k = Math.max(0.04, Math.min(0.96, (hr - 6) / 12)), ang = k * Math.PI;
      this.sun.position.set(-Math.cos(ang) * 13, 5 + Math.sin(ang) * 10, 7); const warm = 1 - Math.sin(ang); this.sun.color.setRGB(1, 0.96 - warm * 0.18, 0.9 - warm * 0.38);
    }
    const Rd = this.radio;
    const rp = this.radioPopRef.current;
    if (rp && Rd) { Rd.rg.updateMatrixWorld(); const v = Rd.rg.localToWorld(new T.Vector3(0.7, 0.6, 0)).project(this.cam); let sx = (v.x + 1) / 2 * innerWidth + 16, sy = (1 - v.y) / 2 * innerHeight; const pw = rp.offsetWidth || 280, ph = rp.offsetHeight || 360; sx = Math.max(12, Math.min(innerWidth - pw - 12, sx)); sy = Math.max(80, Math.min(innerHeight - ph - 12, sy - ph / 2)); rp.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)'; }
    if (Rd) {
      const on = !!this.mus, bpm = (this.STATIONS[this.station] || {}).bpm || 74, beat = on ? Math.pow(Math.max(0, Math.sin(t * Math.PI * bpm / 60)), 6) : 0;
      Rd.spk.scale.setScalar(1 + beat * 0.06); Rd.led.material.color.setHex(on ? 0xef4444 : 0x334155);
      Rd.rg.position.y = -1.25 + beat * 0.01;
      Rd.press = Math.max(0, Rd.press - dt * 4); if (Rd.pressK) { Rd.pressK.position.z = 0.32 - Math.sin(Math.PI * (1 - Rd.press)) * 0.025 * (Rd.press > 0 ? 1 : 0); Rd.pressK.rotation.y += Rd.press > 0 ? dt * 6 : 0; }
      Rd.notes.forEach((sp, i) => { const f = (t * 0.4 + i / 3) % 1; sp.visible = on; sp.position.set(-0.3 + Math.sin(t * 2 + i * 2) * 0.12 - f * 0.1, 0.7 + f * 1.1, 0.35); sp.material.opacity = Math.sin(Math.PI * f); sp.material.rotation = Math.sin(t * 3 + i) * 0.3; });
    }
    const C = this.cat;
    if (C) {
      C.wake = Math.max(0, (C.wake || 0) - dt / 3); const w = C.wake, p = 1 - w, on = w > 0;
      const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
      const up = on ? sm(0, 0.15, p) * (1 - sm(0.8, 1, p)) : 0, st = on ? sm(0.25, 0.48, p) * (1 - sm(0.6, 0.82, p)) : 0;
      const br = Math.sin(t * 1.6) * 0.018 * (1 - up);
      C.body.scale.set(1.1 + st * 0.3, 0.52 + br + st * 0.04, 0.78 - st * 0.06); C.bodyG.position.set(-st * 0.08, st * 0.05, 0);
      C.headG.position.set(0.52 + st * 0.12, 0.27 + up * 0.17 + br * 0.5, 0.28 - up * 0.05); C.headG.rotation.set(-up * 0.3, Math.sin(t * 4) * 0.1 * up, (on ? Math.sin(p * 20) * 0.05 : 0) + (1 - up) * 0.18);
      C.eyesC.forEach(e => e.visible = up < 0.35); C.eyesO.forEach(e => e.visible = up >= 0.35);
      const n = C.tail.length, lift = st, flick = on ? Math.sin(t * 7) * 0.35 : Math.sin(t * 0.9) * 0.08;
      for (let i = 0; i < n; i++) { const s = i / (n - 1), a = Math.PI + 0.1 - s * Math.PI * (1.05 - lift * 0.45) + (s > 0.6 ? (s - 0.6) * flick : 0), rx = 0.66 + s * 0.04, rz = 0.5 + s * 0.06;
        C.tail[i].position.set(Math.cos(a) * rx, 0.07 + Math.sin(s * Math.PI) * 0.03 + lift * s * s * 0.6 + (s > 0.75 ? Math.sin(t * 1.3) * 0.02 * (1 - lift) : 0), Math.sin(a) * rz); }
      C.zs.forEach((z, i) => { const f = (t * 0.35 + i / 3) % 1; z.visible = !on; z.position.set(0.6 + f * 0.35, 0.55 + f * 0.7, 0.3); z.material.opacity = Math.sin(Math.PI * f) * 0.9; z.scale.setScalar(0.14 + f * 0.14); });
    }
  }
  buildDust() {
    const T = this.T, N = 140, pos = new Float32Array(N * 3); this.dust = [];
    const head = new T.Vector3(4.3, 2.75, -1.95), tgt = new T.Vector3(2.55, 0.1, -0.95);
    for (let i = 0; i < N; i++) { const f = Math.random(), r = 0.1 + f * 1.25, a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r; this.dust.push({ f, a, rr, sp: 0.02 + Math.random() * 0.05, ph: Math.random() * 6 }); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    this.dustPts = new T.Points(geo, new T.PointsMaterial({ color: 0xffe2a8, size: 0.07, map: this.tex.glow, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    this.dustHead = head; this.dustTgt = tgt; this.scene.add(this.dustPts);
  }
  drawSky(t) {
    const tex = this.tex.sky; if (!tex) return; const cvs = tex.image, x = cvs.getContext('2d'), w = cvs.width, h = cvs.height;
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7cc4ea'); g.addColorStop(.7, '#cdeaf5'); g.addColorStop(1, '#f4f1e4'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const cloud = (cx, cy, s) => { x.fillStyle = 'rgba(255,255,255,.9)'; [[0, 0, 1], [0.9, 0.12, .78], [-0.85, 0.15, .7], [0.35, -0.35, .72]].forEach(([dx, dy, r]) => { x.beginPath(); x.arc(cx + dx * 50 * s, cy + dy * 50 * s, r * 50 * s, 0, 7); x.fill(); }); };
    [[0.004, 150, 1.1, 0], [0.007, 290, 0.8, 0.4], [0.003, 90, 0.6, 0.7]].forEach(([v, y, s, o]) => { const span = w + 260; cloud(((t * v * 60 + o * span) % span) - 130, y, s); });
    for (let i = 0; i < 3; i++) { const span = w + 120, bx = ((t * 38 + i * 26 + (Math.floor(t / 9) % 2) * 60) % (span * 2.2)) - 60, by = 220 + i * 18 + Math.sin(t * 1.5 + i) * 10; if (bx > span) continue; const fl = Math.sin(t * 9 + i * 2) * 7; x.strokeStyle = '#334155'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(bx - 12, by - fl); x.quadraticCurveTo(bx - 5, by - 4, bx, by); x.quadraticCurveTo(bx + 5, by - 4, bx + 12, by - fl); x.stroke(); }
    x.fillStyle = '#9fcf9a'; x.beginPath(); x.moveTo(0, h); for (let px = 0; px <= w; px += 16) x.lineTo(px, h - 90 - Math.sin(px * .03) * 26 - Math.sin(px * .011) * 30); x.lineTo(w, h); x.fill();
    x.fillStyle = '#6fae78'; x.beginPath(); x.moveTo(0, h); for (let px = 0; px <= w; px += 16) x.lineTo(px, h - 40 - Math.sin(px * .05 + 1) * 16); x.lineTo(w, h); x.fill();
    tex.needsUpdate = true;
  }
  isSheetMode() { const w = innerWidth, hh = innerHeight; return w < 640 || (w < 1024 && hh > w * 1.05); }
  freeRect() {
    const W = innerWidth, H = innerHeight, top = W < 560 ? 70 : 84;
    if (this.isSheetMode()) return { x0: 12, x1: W - 12, y0: top, y1: H * 0.36 - 10 };
    const pw = Math.min(460, W - 32) + 16;
    return { x0: 24, x1: Math.max(140, W - pw - 24), y0: top, y1: H - 24 };
  }
  fitPose(box, dir, rect, minD) {
    const T = this.T, c = this._fc2 || (this._fc2 = new T.PerspectiveCamera());
    c.fov = this.cam.fov; c.aspect = innerWidth / innerHeight; c.near = .1; c.far = 200; c.clearViewOffset(); c.updateProjectionMatrix();
    const ctr = box.getCenter(new T.Vector3()), pts = [];
    for (const X of [box.min.x, box.max.x]) for (const Y of [box.min.y, box.max.y]) for (const Z of [box.min.z, box.max.z]) pts.push(new T.Vector3(X, Y, Z));
    const v = new T.Vector3();
    const ext = (d) => {
      c.position.copy(ctr).addScaledVector(dir, d); c.lookAt(ctr); c.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) { v.copy(p).project(c); if (v.z > 1 || v.z < -1) return null; const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    };
    const fw = Math.max(80, rect.x1 - rect.x0), fh = Math.max(80, rect.y1 - rect.y0);
    let d = 10;
    for (let i = 0; i < 8; i++) { const e = ext(d); if (!e) { d *= 1.5; continue; } const f = Math.min(fw / e.w, fh / e.h) * 0.86; if (!Number.isFinite(f) || f <= 0) break; d = Math.max(minD || 4, d / f); }
    if (!Number.isFinite(d)) d = 10;
    const e = ext(d) || { cx: innerWidth / 2, cy: innerHeight / 2 };
    return { t: ctr, p: ctr.clone().addScaledVector(dir, d), s: (rect.y0 + rect.y1) / 2 - e.cy, sx: (rect.x0 + rect.x1) / 2 - e.cx };
  }
  focusPose(key) {
    const T = this.T, it = this.items[key], rect = this.freeRect();
    let box, dir;
    if (it.boxFn) { box = it.boxFn(); dir = it.dir || new T.Vector3(0, .1, 1).normalize(); }
    else {
      box = new T.Box3(); it.g.updateMatrixWorld(true);
      it.g.traverse(n => { if (n.isMesh && n.visible && n.material && !Array.isArray(n.material) && n.material.blending !== T.AdditiveBlending && n.material.opacity !== 0) { n.geometry.computeBoundingBox && !n.geometry.boundingBox && n.geometry.computeBoundingBox(); const bb = n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld); box.union(bb); } else if (n.isMesh && Array.isArray(n.material)) { if (!n.geometry.boundingBox) n.geometry.computeBoundingBox(); box.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld)); } });
      dir = new T.Vector3(0, 3.5, 4.6).normalize();
    }
    if (box.isEmpty()) box.setFromCenterAndSize(new T.Vector3(it.x, (it.ay || 1) * .5, it.z), new T.Vector3(2, 2, 2));
    return this.fitPose(box, dir, rect, 3.5);
  }
  goTo(pose, d) { this.tw = { p0: this.camP.clone(), t0: this.camT.clone(), s0: this.camS || 0, x0: this.camSX || 0, p1: pose.p, t1: pose.t, s1: pose.s || 0, x1: pose.sx || 0, t: 0, d: d || 1.35 }; }
  tapItem(key, pt) {
    const it = this.items && this.items[key]; if (!it || it.static || !it.g) return;
    const cl = (v) => Math.max(-1.6, Math.min(1.6, v)), dx = pt ? cl(pt.x - it.x) : (Math.random() - .5) * 0.8, dz = pt ? cl(pt.z - it.z) : (Math.random() - .5) * 0.8;
    const tall = Math.min(1.6, 0.6 + (it.ay || 1) * 0.35);
    it.tap = { y: 0, vy: 3.6 / Math.sqrt(tall), ax: 0, vax: dz * 2.4 / tall, az: 0, vaz: -dx * 2.4 / tall, sq: 0, vsq: -3.2, spin: (Math.random() < .5 ? -1 : 1) * 0.9 };
  }
  endIntro() { if (this.introOn) { this.introOn = false; this.setState({ intro: false }); } }
  openPanel(key) {
    this.endIntro(); // [พอร์ต]
    this.ensureAudio(); this.tapItem(key, this._tapPt); this._tapPt = null;
    if (key === 'kru') { this.kruTap(); return; }
    if (key === 'cat') { this.catTap(); return; }
    if (key === 'radio' || key === 'radioPlay' || key === 'radioNext') { this.radioAction(key); return; }
    if (key === 'window') { this.toggleWindow(); return; }
    if (key === 'drawer') { this.toggleDrawer(!this.drawerOpen); return; }
    if (key === 'lamp') { this.sfx('lamp'); this.setNight(!this.state.night); this.say(this.state.night ? 'เช้าแล้ว! มาเรียนกันต่อครับ' : 'ดึกแล้ว อ่านอีกนิดนะครับ สู้ๆ', 3500); return; }
    if (key !== this.state.panel) this.sfx(key);
    this.setState({ panel: key, hover: null }); this.dockHover = null;
    if (key === 'mycourse' && this.props.onNeedMy) this.props.onNeedMy(); // [พอร์ต] อ่าน "เรียนค้างไว้" เฉพาะตอนเปิดแผง
    if (this.T && this.items[key] && !(this.compact && key === 'reviews')) this.goTo(this.focusPose(key));
  }
  drawDrawerQuote() {
    const Q = this.QUOTES; let i = Math.floor(Math.random() * Q.length); if (i === this._dqi) i = (i + 1) % Q.length; this._dqi = i;
    const q = Q[i], tex = this.tex.drawerQuote; if (!tex) return; const cv = tex.image, x = cv.getContext('2d'), w = cv.width, hh = cv.height;
    x.fillStyle = '#fef9c3'; x.fillRect(0, 0, w, hh);
    x.strokeStyle = 'rgba(202,138,4,.18)'; x.lineWidth = 2; for (let y = 150; y < hh - 30; y += 62) { x.beginPath(); x.moveTo(40, y); x.lineTo(w - 40, y); x.stroke(); }
    x.fillStyle = '#b45309'; x.font = "700 30px 'IBM Plex Sans Thai Looped', sans-serif"; x.fillText('คำคมวันนี้', 48, 78);
    x.fillStyle = '#fbbf24'; x.fillRect(48, 92, 70, 5);
    x.fillStyle = '#0f172a'; x.font = "60px 'Itim', cursive";
    const segs = (window.Intl && Intl.Segmenter) ? Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(q), s => s.segment) : q.split(/(\s+)/);
    const lines = []; let s = ''; segs.forEach(g => { if (s && x.measureText(s + g).width > w - 110) { lines.push(s); s = g.trimStart(); } else s += g; }); lines.push(s);
    const cut = lines.length > 4; lines.slice(0, 4).forEach((l, j) => x.fillText((j === 0 ? '“' : '') + l.trim() + (j === Math.min(3, lines.length - 1) ? (cut ? '…”' : '”') : ''), 52, 196 + j * 62));
    x.fillStyle = '#0f766e'; x.font = "36px 'Itim', cursive"; x.textAlign = 'right'; x.fillText('— ครูฮีม', w - 50, hh - 36); x.textAlign = 'left';
    tex.needsUpdate = true;
  }
  toggleDrawer(open) {
    this.endIntro(); // [พอร์ต]
    if (open) this.drawDrawerQuote();
    this.drawerOpen = open; this.setState({ drawer: open }); this.sfx('drawer');
    if (!this.T) return;
    if (open) this.goTo(this.drawerPose(), 1.2);
    else this.goTo(this.homePose(), 1.1);
  }
  drawerPose() {
    const T = this.T, g = this.items.drawer.g; g.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(g); box.min.z += 3.05 - (g.position.z - 3.56); box.max.z += 3.05 - (g.position.z - 3.56);
    const dr = this.dockRef && this.dockRef.current, bot = dr ? dr.getBoundingClientRect().top - 12 : innerHeight - 90;
    return this.fitPose(box, new T.Vector3(0, 1.25, 0.8).normalize(), { x0: 24, x1: innerWidth - 24, y0: 90, y1: Math.max(200, bot) }, 3);
  }
  closePanel() {
    if (!this.state.panel) { if (this.drawerOpen) this.toggleDrawer(false); return; }
    this.sfx('close');
    this.setState({ panel: null });
    if (this.T) this.goTo(this.homePose(), 1.2);
  }
  clickAt(e) {
    if (!this.T) return;
    if (this.introOn) { this.skipIntro(); return; }
    this.ray.setFromCamera(new this.T.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)), this.cam);
    const h = this.ray.intersectObjects(this.hitList.concat(this.boardHits || [], this.roomHits || []), false)[0];
    if (h && h.object.userData.key === 'courses' && h.object.userData.book !== undefined) { const bk = this.books[h.object.userData.book]; if (bk && bk.cat) this.setState({ cat: bk.cat }); }
    if (h && h.object.userData.key === 'prop') { this.flick(h.object.userData.prop, h.point); return; }
    if (h) { this._tapPt = h.point.clone(); this.openPanel(h.object.userData.key); } else this.closePanel();
  }
  resize() {
    if (!this.R) return; this.R.setSize(innerWidth, innerHeight); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix();
    if (this.applyLayout()) this._roomKey = null; // [พอร์ต] สลับผังมือถือ/จอใหญ่
    // [พอร์ต] ลิ้นชักเปิดอยู่ → จัดภาพลิ้นชักใหม่ · กล้องกำลังบิน → เปลี่ยนปลายทางแทนการกระโดด
    const p = this.state.panel ? this.focusPose(this.state.panel) : (this.drawerOpen && this.items.drawer ? (this.homePose(), this.drawerPose()) : this.homePose());
    if (this.tw && !this.introOn) { this.tw.p1 = p.p; this.tw.t1 = p.t; this.tw.s1 = p.s || 0; this.tw.x1 = p.sx || 0; return; }
    if (this.tw && this.introOn) { const q = this.homePose(); this.tw.p1 = q.p; this.tw.t1 = q.t; this.tw.s1 = q.s || 0; this.tw.x1 = 0; return; }
    this.camP.copy(p.p); this.camT.copy(p.t); this.camS = p.s; this.camSX = p.sx || 0;
  }

  loop = () => {
    if (this._dead || !this.R) return;
    this.raf = requestAnimationFrame(this.loop);
    try { this.frame(); } catch (err) { if (!this._errd) { this._errd = true; console.error('desk loop', err); window.__deskErr = String(err && err.stack || err); } }
  };
  frame() {
    if (!this.homeOk && innerWidth > 0 && innerHeight > 0 && !this.state.panel && !this.tw) { this.R.setSize(innerWidth, innerHeight); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); const q = this.homePose(); this.camP.copy(q.p); this.camT.copy(q.t); this.camS = q.s; this.camSX = 0; }
    if (!Number.isFinite(this.camP.x + this.camP.y + this.camP.z + (this.camS || 0) + (this.camSX || 0))) { this.camSX = 0; this.homeOk = false; this.camP.set(0, 12, 20); this.camT.set(0, 0.4, 0); this.camS = 0; }
    const T = this.T, now = performance.now() / 1000, gap = now - this.last, dt = Math.min(0.05, gap); this.last = now; const t = now - this.t0;
    if (gap > 1 && !this._fpsDone) { this._fpsN = 0; this._fpsS = now; } // [พอร์ต] เฟรมขาดช่วง ≥1 วิ (สลับแอป/แท็บ) → เริ่มวัดใหม่ (เครื่องช้าจริงเฟรมไม่ห่างขนาดนี้)
    this.m.x += (this.mt.x - this.m.x) * 0.05; this.m.y += (this.mt.y - this.m.y) * 0.05;
    let hk = null;
    if (this.ptrIn && t > 1.4 && !this.tw) { this.ray.setFromCamera(this.ndc, this.cam);
      const rest = []; for (const it of this.order) if (!it.static && it.g && it.g.position.y !== 0) { rest.push([it.g, it.g.position.y]); it.g.position.y = 0; it.g.updateMatrixWorld(true); }
      const h = this.ray.intersectObjects(this.hitList.concat(this.boardHits || [], this.roomHits || []), false)[0];
      for (const [g, y] of rest) { g.position.y = y; g.updateMatrixWorld(true); } if (h) hk = h.object.userData.key; this.hoverBookIdx = h && h.object.userData.book; }
    else this.hoverBookIdx = undefined;
    const hc = this.hoverBookIdx !== undefined && this.books && this.books[this.hoverBookIdx] ? (this.books[this.hoverBookIdx].cat || 'คอร์สทั้งหมด') : null;
    if (hc !== this.state.hoverCat) this.setState({ hoverCat: hc });
    hk = hk || this.dockHover || null;
    if (hk !== this.hoverKey) { this.hoverKey = hk; this.R.domElement.style.cursor = hk ? 'pointer' : 'default'; this.setState({ hover: hk }); if (hk) { const ix = [...this.MENU.map(m => m.k), 'lamp', 'kru'].indexOf(hk); this.sfx(hk === 'summary' ? 'scribble' : 'hover', Math.pow(2, (ix % 6) / 12)); } }
    const bounce = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; };
    const active = this.state.panel;
    for (const it of this.order) {
      const tg = (hk === it.k || active === it.k) ? 1 : 0;
      it.v = (it.v + (tg - it.h) * 0.14) * 0.74; it.h += it.v;
      if (it.static) { if (it.anim) it.anim(it.h, t); continue; }
      const p = Math.max(0, Math.min(1, (t - it.delay) / 0.95));
      it.g.visible = p > 0;
      it.g.position.y = (1 - bounce(p)) * 7 + it.h * 0.22;
      it.g.rotation.y = it.rotY + it.h * 0.06;
      if (it.anim) it.anim(it.h, t);
    }
    if (this.mug) { const p = Math.max(0, Math.min(1, (t - this.mug.delay) / 0.95)); this.mug.g.visible = p > 0; this.mug.g.position.y = (1 - bounce(p)) * 7; }
    this.steam.forEach(s => { const f = (t * 0.32 + s.userData.ph) % 1; s.position.set(0.95 + Math.sin(t * 1.3 + s.userData.ph * 6) * 0.08, 0.95 + f * 1.3, 0.35); s.material.opacity = Math.sin(Math.PI * f) * 0.35 * (this.mug.g.visible ? 1 : 0); s.scale.setScalar(0.5 + f * 0.9); s.quaternion.copy(this.cam.quaternion); });

    const rk = hk || active, rit = rk && this.items[rk];
    this.ringA += ((rit ? 0.9 : 0) - this.ringA) * 0.12;
    if (rit) { this.ring.position.x = rit.x; this.ring.position.z = rit.z; this.ringS = rit.rs; }
    this.ring.material.opacity = this.ringA; this.ring.scale.setScalar((this.ringS || 1) * (1 + Math.sin(t * 4) * 0.03));

    const nt = this.state.night ? 1 : 0; this.nightT += (nt - this.nightT) * 0.05; const n = this.nightT;
    this.hemi.intensity = 0.55 - 0.43 * n; this.sun.intensity = 1.25 - 1.1 * n; this.fill.intensity = 0.35 - 0.28 * n;
    if (this.skyMat) this.skyMat.color.setRGB(1 - .78 * n, 1 - .72 * n, 1 - .55 * n);
    if (this.hS) { const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, mn = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + mn / 60; this.hS.rotation.z = -sec / 60 * Math.PI * 2; this.hM.rotation.z = -mn / 60 * Math.PI * 2; this.hH.rotation.z = -hr / 12 * Math.PI * 2; }
    this.spot.intensity = 3.6 * n; this.bulbMat.emissiveIntensity = 2.6 * n + (this.lampHover || 0) * 0.8;

    if (this.tw) { this.tw.t = Math.min(1, this.tw.t + dt / this.tw.d); const x = this.tw.t, e = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; this.camP.lerpVectors(this.tw.p0, this.tw.p1, e); this.camT.lerpVectors(this.tw.t0, this.tw.t1, e); this.camS = this.tw.s0 + (this.tw.s1 - this.tw.s0) * e; this.camSX = this.tw.x0 + (this.tw.x1 - this.tw.x0) * e; if (this.tw.t >= 1) this.tw = null; }
    const par = active ? 0.2 : 1;
    if (!this.dragging && (active || now - (this.lastDrag || 0) > 2.2)) { this.yawT *= 0.96; this.pitchT *= 0.96; }
    this.yaw += (this.yawT - this.yaw) * 0.12; this.pitch += (this.pitchT - this.pitch) * 0.12;
    this.cam.position.set(this.camP.x + this.m.x * 0.6 * par, this.camP.y + this.m.y * 0.3 * par, this.camP.z);
    if (Math.abs(this.yaw) + Math.abs(this.pitch) > 1e-4) { const off = this.cam.position.clone().sub(this.camT); off.applyAxisAngle(new T.Vector3(0, 1, 0), this.yaw); const side = new T.Vector3().crossVectors(off, new T.Vector3(0, 1, 0)).normalize(); off.applyAxisAngle(side, this.pitch); this.cam.position.copy(this.camT).add(off); }
    this.cam.lookAt(this.camT);
    if (!this._skyT || now - this._skyT > 1 / 15) { this._skyT = now; this.drawSky(t); }
    if (this._boardAspect && this.quoteP < 1 && t > 2.4) { this.quoteP = Math.min(1, this.quoteP + dt / 2.6); if (!this._qT || now - this._qT > 1 / 20 || this.quoteP >= 1) { this._qT = now; this.boardTex(this._boardAspect, this.quoteP); } }
    if (this.promoRib) this.promoRib.rotation.z = Math.PI / 4 + Math.sin(t * 1.6) * 0.015;
    if (this.dustPts) {
      this.dustPts.material.opacity = n * 0.9; this.dustPts.visible = n > 0.02;
      if (n > 0.02) { const arr = this.dustPts.geometry.attributes.position.array, H0 = this.dustHead, T0 = this.dustTgt;
        this.dust.forEach((d, i) => { d.f -= d.sp * dt * 0.25; if (d.f < 0) d.f += 1; const r = (0.1 + d.f * 1.25) * (d.rr / (0.1 + d.f * 1.25 + 1e-6)) ; const a = d.a + t * 0.2 + d.ph; const cx = H0.x + (T0.x - H0.x) * d.f, cy = H0.y + (T0.y - H0.y) * d.f, cz = H0.z + (T0.z - H0.z) * d.f, rad = d.rr * (0.15 + d.f); arr[i * 3] = cx + Math.cos(a) * rad; arr[i * 3 + 1] = cy + Math.sin(t * 0.7 + d.ph) * 0.05; arr[i * 3 + 2] = cz + Math.sin(a) * rad; });
        this.dustPts.geometry.attributes.position.needsUpdate = true; }
    }
    if (!active && !this.reduced && t > 3 && (!this.nextWig || t > this.nextWig)) { this.nextWig = t + 5 + Math.random() * 4; const pool = this.order.filter(o => !o.static && o.k !== hk && o.k !== 'lamp'); const pick = pool[Math.floor(Math.random() * pool.length)]; if (pick) pick.wig = 1; }
    this.stepProps(dt, now);
    for (const o of this.order) { const tp = o.tap; if (!tp || o.static) continue;
      const st = Math.min(dt, 1 / 30);
      tp.vy -= 18 * st; tp.y += tp.vy * st;
      if (tp.y < 0) { tp.y = 0; if (tp.vy < -0.7) { if (!tp.snd || now - tp.snd > 0.12) { tp.snd = now; this.sfx('land', Math.min(1, -tp.vy * 0.25)); } tp.vsq += 1.8 * Math.min(1.2, -tp.vy * 0.4); tp.vy = -tp.vy * 0.32; tp.vax *= 0.7; tp.vaz *= 0.7; } else tp.vy = 0; }
      tp.vax += (-95 * tp.ax - 6.5 * tp.vax) * st; tp.ax += tp.vax * st;
      tp.vaz += (-95 * tp.az - 6.5 * tp.vaz) * st; tp.az += tp.vaz * st;
      tp.vsq += (-170 * tp.sq - 12 * tp.vsq) * st; tp.sq += tp.vsq * st;
      tp.spin *= Math.pow(0.02, st);
      tp.fx = tp.fx || { x: o.g.position.x, z: o.g.position.z };
      o.tapOut = tp; o.tapRY = tp.spin;
      const done = tp.y === 0 && tp.vy === 0 && Math.abs(tp.ax) + Math.abs(tp.az) + Math.abs(tp.sq) + Math.abs(tp.vax) + Math.abs(tp.vaz) + Math.abs(tp.vsq) + Math.abs(tp.spin) < 0.003;
      if (done) { o.tap = null; o.tapOut = null; o.g.rotation.x = 0; o.g.scale.setScalar(o.bs || 1); }
    }
    for (const o of this.order) if (o.wig > 0) { o.wig = Math.max(0, o.wig - dt * 1.6); const p = 1 - o.wig; o.g.position.y += Math.sin(p * Math.PI) * 0.22 * (1 - p * 0.5); o.g.rotation.z = Math.sin(p * Math.PI * 4) * 0.05 * o.wig; } else if (o.g && !o.static) o.g.rotation.z = 0;
    for (const o of this.order) if (o.tapOut) { const tp = o.tapOut; o.g.position.y += tp.y; o.g.rotation.x = tp.ax; o.g.rotation.z += tp.az; o.g.rotation.y += tp.spin * 0.25; const bs = o.bs || 1; o.g.scale.set(bs * (1 + tp.sq * 0.45), bs * (1 - tp.sq), bs * (1 + tp.sq * 0.45)); }
    if (this.kru) {
      const K = this.kru, kj = this.kruJump || 0; this.kruJump = Math.max(0, kj - dt * 1.4);
      const vis = t > 1.4; K.g.visible = vis;
      const pk = Math.min(1, Math.max(0, (t - 1.4) / 0.9)), pop = pk < 1 ? 1 - Math.pow(1 - pk, 3) * Math.cos(pk * 6) : 1;
      const hv = hk === 'kru' ? 1 : 0; K.hv = (K.hv || 0) + (hv - (K.hv || 0)) * 0.12;
      K.pivot.scale.setScalar(Math.max(0.01, pop));
      K.pivot.position.z = 0; K.pivot.rotation.set(0, 0, -0.045);
      this.kruMat.color.setScalar(1 - 0.55 * n);
      const kr = this.kruRef.current;
      if (kr) { const show = vis && !this.compact && pk >= 1 && !active && !this.drawerOpen && (!hk || hk === 'kru') && now < (this.kruShow ?? (now + 99));
        if (show) { K.pivot.updateMatrixWorld(true); const v = K.pivot.localToWorld(new T.Vector3(0, -K.PH / 2 - 0.05, 0.05)).project(this.cam); const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight, bh2 = (kr.offsetHeight || 44) / 2;
          kr.style.flexDirection = 'column-reverse'; const ar = kr.lastElementChild; ar.style.borderLeft = '8px solid transparent'; ar.style.borderRight = '8px solid transparent'; ar.style.borderTop = '0'; ar.style.borderBottom = '9px solid #fff'; ar.style.marginRight = '0';
          // [พอร์ต] สเปกข้อ 14.4: กล่องคำพูดห้ามทับหัวเว็บ/ข้อความบนกระดาน/แถบเมนู — จอแคบโปสเตอร์ครูอยู่นอกจอ
          // กล่องเลยไปทับข้อความบนกระดาน จึงซ่อนเมื่อโปสเตอร์อยู่นอกจอหรือกล่องชนส่วนเหล่านั้น
          const bw2 = (kr.offsetWidth || 200) / 2, bx = Math.min(innerWidth - 8 - bw2, Math.max(8 + bw2, sx)), by = sy + 4, bhh = kr.offsetHeight || 44;
          if (!this._kruBlk || now - this._kruBlk.t > 0.5) { const R0 = []; const hr = this.heroRef.current; if (hr) for (const ch of hr.children) { const q = ch.getBoundingClientRect(); if (q.width >= 4 && q.height >= 4) R0.push(q); } const dr = this.dockRef.current; this._kruBlk = { t: now, hero: R0, dockTop: dr ? dr.getBoundingClientRect().top : innerHeight, hdr: innerWidth < 560 ? 66 : 74 }; }
          const kb = this._kruBlk, hit = kb.hero.some(q => bx - bw2 < q.right && bx + bw2 > q.left && by < q.bottom && by + bhh > q.top);
          if (sx < 0 || sx > innerWidth || by < kb.hdr || by + bhh > kb.dockTop - 6 || hit) kr.style.opacity = '0';
          else { kr.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px) translate(-50%,0)`; kr.style.opacity = '1'; } } else kr.style.opacity = '0'; }
      if (this.kruShow === undefined && t > 2.4) this.kruShow = now + 4;
    }
    this.stepRoomFx(dt, t, now);
    if (!this.introOn && t > 6 && !this._fpsDone) { this._fpsN = (this._fpsN || 0) + 1; this._fpsS = this._fpsS || now; if (now - this._fpsS > 6) { const fps = this._fpsN / (now - this._fpsS); this._fpsDone = true; let ok = false; try { ok = localStorage.getItem('kh_desk_slow_ok') === '1'; } catch (e) {} if (fps < 22 && !ok && !document.hidden) this.setState({ slowToast: true }); } }
    if (this.introOn && !this.tw) { this.introOn = false; this.setState({ intro: false }); const q = this.homePose(); this.camP.copy(q.p); this.camT.copy(q.t); this.camS = q.s; this.camSX = 0; }
    const W = innerWidth, Hh = innerHeight; this.cam.setViewOffset(W, Hh, -(this.camSX || 0), -(this.camS || 0), W, Hh);

    const tip = this.tipRef.current;
    if (tip) {
      const it = hk && this.items[hk];
      if (it && !active) {
        const v = new T.Vector3(it.x, it.ay + it.h * 0.22 + 0.15, it.z).project(this.cam);
        let sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
        const th = tip.offsetHeight || 90, tw = tip.offsetWidth || 200, hdr = innerWidth < 560 ? 66 : 74;
        // [พอร์ต] สเปกข้อ 14.4: ป้ายห้ามทับข้อความบนกระดาน — ถ้าจะทับให้ย้ายไปใต้ชิ้นนั้นแทน (ต้นแบบเช็กแค่หัวเว็บ)
        const hb = !this.state.drawer && this.heroBox, overHero = !!hb && sx + tw / 2 > hb.l && sx - tw / 2 < hb.r && sy - th < hb.b + 6;
        const below = sy - th < hdr || overHero;
        if (below) { let by; if (it.boxFn) { const b = it.boxFn(); by = new T.Vector3(it.x, b.min.y, (b.min.z + b.max.z) / 2).project(this.cam); sx = (by.x + 1) / 2 * innerWidth; } else by = new T.Vector3(it.x, 0, it.z + 0.6).project(this.cam); sy = (1 - by.y) / 2 * innerHeight + 6; }
        sx = Math.max(tw / 2 + 8, Math.min(innerWidth - tw / 2 - 8, sx));
        if (tip._below !== below) { tip._below = below; tip.style.flexDirection = below ? 'column-reverse' : 'column'; const stem = tip.lastElementChild; if (stem) stem.style.background = below ? 'linear-gradient(rgba(15,23,42,0),#0f172a)' : 'linear-gradient(#0f172a,rgba(15,23,42,0))'; }
        tip.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,${below ? '0' : '-100%'})`; tip.style.opacity = '1';
      } else tip.style.opacity = '0';
    }
    const playing = active === 'mycourse';
    if (this.scrMat && playing !== this._playing) { this._playing = playing; this.vidT0 = t; this.scrMat.map = playing ? this.vidTex : this.tex.screen; this.scrMat.needsUpdate = true; }
    if (playing && this.vidX && (!this._vf || t - this._vf > 1 / 30)) { this._vf = t; this.drawVideo(t - this.vidT0); this.vidTex.needsUpdate = true; }
    if (this.halo) this.halo.material.opacity = active === 'mycourse' ? 0 : 0.35 + Math.sin(t * 3) * 0.2 + (hk === 'mycourse' ? 0.3 : 0);
    this.R.render(this.scene, this.cam);
  }

  // [พอร์ต] แผงแล็ปท็อป: ต้นแบบโชว์การ์ด "กำลังเรียน" สมมติ — ของจริงแยก 3 แบบ
  //   ยังไม่ล็อกอิน = การ์ดตัวอย่าง (ติดป้าย "ตัวอย่าง") · ล็อกอินแล้ว = บทที่เรียนค้างไว้จริง + คอร์สที่ลงทะเบียน
  myVals() {
    const my = this.props.my || { state: 'loading' }, st = my.state, rs = my.resume || null, list = my.courses || [];
    const hasPct = !!(rs && rs.total);
    return {
      myLoading: st === 'loading', myGuest: st === 'guest', myUser: st === 'fetching' || st === 'ready' || st === 'error',
      myFetching: st === 'fetching', myError: st === 'error', myReady: st === 'ready',
      myHello: my.name ? 'สวัสดีครับ ' + my.name : 'สวัสดีครับ',
      hasResume: st === 'ready' && !!rs, rsCourse: rs ? rs.courseTitle : '', rsLesson: rs ? rs.lessonTitle : '', hasRsLesson: !!(rs && rs.lessonTitle), rsHref: rs ? rs.href : '/my-courses',
      hasRsPct: hasPct, rsPct: hasPct ? Math.round(rs.done / rs.total * 100) + '%' : '0%', rsPctText: hasPct ? 'เรียนแล้ว ' + rs.done + ' จาก ' + rs.total + ' บท' : '',
      myCourses: list, hasMyCourses: st === 'ready' && list.length > 0, noMyCourses: st === 'ready' && !rs && list.length === 0,
      openCourses: () => this.openPanel('courses'),
      authHref: st === 'guest' || st === 'loading' ? '/login' : '/my-courses', authText: st === 'guest' || st === 'loading' ? 'เข้าสู่ระบบ' : 'คอร์สของฉัน',
      authVis: st === 'loading' ? 'hidden' : 'visible'
    };
  }
  renderVals() {
    // [พอร์ต] วันสอบ/วันเริ่มแถบความคืบหน้า มาจากหลังบ้าน (/admin/countdown)
    const cdc = this.props.countdown || {}, now = this.state.now, target = this.cdTarget(), start = Number.isFinite(cdc.startMs) ? cdc.startMs : target - 120 * 86400000;
    const diff = Math.max(0, target - now), pad = n => String(n).padStart(2, '0');
    const pct = target - start <= 0 ? 100 : Math.max(0, Math.min(100, (now - start) / (target - start) * 100));
    const stn = this.STATIONS ? this.STATIONS[this.station || 0] : { name: '' }, stn2 = this.STATIONS ? this.STATIONS[((this.station || 0) + 1) % this.STATIONS.length] : { name: '' };
    const all = [...this.MENU, this.LAMP, ...['radio', 'radioPlay', 'radioNext'].map(k => ({ k, t: this.state.music && !this.state.muted ? 'หยุดเพลง' : 'เปิดเพลง Lo-fi', o: 'วิทยุ', d: 'แตะเพื่อเปิด/ปิดเพลง' })), { k: 'kru', t: 'ครูฮีม', o: 'ครูฮีม', d: 'แตะเพื่อฟังคำแนะนำ' }, { k: 'drawer', t: this.state.drawer ? 'ปิดลิ้นชัก' : 'เปิดลิ้นชัก', o: 'ลิ้นชักโต๊ะ', d: 'ดินสอ ปากกา ไม้บรรทัด ยางลบ' }], find = k => all.find(m => m.k === k);
    const hv = find(this.state.hover), pn = find(this.state.panel);
    const days = this.daysLeft(now), fmt = n => '฿' + n.toLocaleString('en-US');
    const desc = (m) => m ? (m.k === 'countdown' ? (diff <= 0 ? 'ถึงวันสอบแล้ว! สู้ ๆ' : 'เหลืออีก ' + days + ' วัน') : (m.k === 'courses' && this.state.hoverCat ? 'หมวด ' + this.state.hoverCat : m.d)) : '';
    const p = this.state.panel;
    return {
      ...(() => {
        const w = this.state.vw || innerWidth, hh = this.state.vh || innerHeight, sheet = w < 640 || (w < 1024 && hh > w * 1.05), tiny = w < 400, small = w < 560;
        return {
          isSheet: sheet, notTiny: !tiny, notSmall: !small,
          hdTop: small ? '12px' : '18px', hdSide: small ? '12px' : '20px', dockBottom: small ? '10px' : '18px',
          asTop: sheet ? 'auto' : '84px', asRight: sheet ? '0px' : '16px', asBottom: sheet ? '0px' : '16px', asLeft: sheet ? '0px' : 'auto',
          asWidth: sheet ? 'auto' : 'min(460px,calc(100vw - 32px))', asRadius: sheet ? '28px 28px 0 0' : '30px',
          asAnim: sheet ? 'khd-up .6s cubic-bezier(.2,.9,.25,1) both' : 'khd-in .75s cubic-bezier(.2,.9,.25,1) both',
          asHeadPad: sheet ? '12px 20px 12px' : '26px 26px 18px', asBodyPad: sheet ? '0 20px 28px' : '0 26px 28px',
          asMaxH: sheet ? '64vh' : 'none', asH: sheet ? '64vh' : 'auto'
        };
      })(),
      rootRef: this.rootRef, canvasHostRef: this.canvasHostRef, tipRef: this.tipRef, kruRef: this.kruRef, kruMsg: this.state.kruMsg, heroOp: this.state.drawer ? '0' : '1', dailyQuote: this.QUOTES[Math.floor((Date.now() + 7 * 3600e3) / 86400000) % this.QUOTES.length],
      soundOn: !this.state.muted, soundOff: this.state.muted,
      introOn: !!this.state.intro && !this.state.noGL, skipIntro: () => this.skipIntro(),
      noGL: !!this.state.noGL, slowToast: !!this.state.slowToast, classicUrl: this.props.classicUrl || '/classic',
      goClassic: () => { try { localStorage.setItem('kh_site_version', 'classic'); } catch (e) {} this.stopMusic && this.stopMusic(); },
      dismissSlow: () => { this.setState({ slowToast: false }); try { localStorage.setItem('kh_desk_slow_ok', '1'); } catch (e) {} },
      radioOpen: !!this.state.radioOpen, radioPopRef: this.radioPopRef, closeRadio: () => this.setState({ radioOpen: false }),
      stations: (this.STATIONS || []).map((s, i) => { const act = i === (this.station || 0) && this.state.music && !this.state.muted; return { n: s.name, fm: s.fm.toFixed(2), mood: s.mood || '', active: act, inactive: !act, pick: () => this.pickStation(i) }; }),
      radioBtnText: this.state.music && !this.state.muted ? '■ หยุดเพลง' : '▶ เล่นเพลง', radioToggle: () => this.radioAction('radioPlay'),
      musicBg: this.state.music && !this.state.muted ? '#fbbf24' : 'var(--chip)', musicInk: this.state.music && !this.state.muted ? '#0f172a' : 'var(--chipInk)',
      toggleMusic: () => { const on = !this.state.music; this.setState({ music: on }); try { localStorage.setItem('kh_desk_music', on ? '1' : '0'); } catch (e) {} this.ensureAudio(); if (on && !this.state.muted) this.startMusic(); else this.stopMusic(); },
      toggleMute: () => { const m = !this.state.muted; this.setState({ muted: m }); try { localStorage.setItem('kh_desk_muted', m ? '1' : '0'); } catch (e) {} if (m) this.stopMusic(); else if (this.state.music) { this.ensureAudio(); setTimeout(() => this.startMusic(), 50); } if (!m) { this.ensureAudio(); setTimeout(() => this.sfx('pop'), 30); } }, heroRef: this.heroRef, dockRef: this.dockRef,
      noPanel: !p, panelOpen: !!p,
      tipObj: hv ? hv.o : '', tipTitle: hv ? hv.t : '', tipDesc: desc(hv),
      dock: this.MENU.map((m, i) => ({
        n: String(i + 1).padStart(2, '0'), t: m.t, on: this.state.hover === m.k, off: this.state.hover !== m.k,
        open: () => this.openPanel(m.k), enter: () => { this.dockHover = m.k; }, leave: () => { this.dockHover = null; }
      })),
      pObj: pn ? pn.o : '', pTitle: pn ? pn.t : '', pDesc: pn ? pn.d : '', pHref: pn && pn.href ? pn.href : '/', pCta: pn && pn.cta ? pn.cta : '',
      isCourses: p === 'courses', isList: p === 'exams' || p === 'summary' || p === 'tips', isCountdown: p === 'countdown', isReviews: p === 'reviews', isStory: p === 'story', isApply: p === 'apply', isContact: p === 'contact', isMy: p === 'mycourse',
      listItems: (this.FEAT[p] || []).map((it, j) => ({ n: pad(j + 1), t: it.t, href: it.href })), hasList: (this.FEAT[p] || []).length > 0,
      cats: this.CATS.map(c => ({ name: c, active: c === this.state.cat, inactive: c !== this.state.cat, pick: () => { this.sfx('tab'); this.setState({ cat: c }); } })),
      // [พอร์ต] คอร์สจริง: ราคา/ราคาเต็มตามข้อมูล (ไม่แต่งราคาขีดฆ่าเอง) ลิงก์ไปหน้าคอร์สแต่ละคอร์ส
      courses: (this.COURSES[this.state.cat] || []).map(c => ({ title: c.title, desc: c.desc, hasDesc: !!c.desc, price: c.price ? fmt(c.price) : 'ฟรี', full: c.fullPrice ? fmt(c.fullPrice) : '', href: c.href })),
      reviews: this.REVIEWS.map(r => Object.assign({}, r, { kid: !!r.kid, parent: !r.kid, hasT: !!r.t, hasC: !!r.c, starText: '★'.repeat(Math.max(1, Math.min(5, r.stars || 5))) })),
      cdD: String(Math.floor(diff / 86400000)), cdH: pad(Math.floor(diff / 3600000) % 24), cdM: pad(Math.floor(diff / 60000) % 60), cdS: pad(Math.floor(diff / 1000) % 60),
      cdPct: pct.toFixed(1) + '%', cdPctText: Math.round(pct), quote: this.QUOTES[this.state.quoteIdx % this.QUOTES.length],
      cdTitle: cdc.title || cdc.examName || 'วันสอบ', cdLead: diff <= 0 ? 'ถึงวันสอบแล้ว! สู้ ๆ' : 'เหลือเวลาอีก', cdShowProgress: cdc.showProgress !== false, cdShowQuote: cdc.showQuote !== false,
      ...this.myVals(),
      closePanel: () => this.closePanel(), toggleNight: () => this.setNight(!this.state.night),
      modal: this.state.modal, openModal: () => this.setState({ modal: true }), closeModal: () => this.setState({ modal: false })
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* [พอร์ต] ฟอนต์ชื่อจริง (Mitr / IBM Plex Sans Thai Looped / Itim) — ภาพวาดบน canvas ของฉากอ้างชื่อฟอนต์ตรงๆ
          ฟอนต์ของ next/font ใน layout ถูกเปลี่ยนชื่อเป็นแบบสุ่ม canvas จึงหาไม่เจอ */}
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&family=Mitr:wght@400;500;600&family=Itim&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: DESK_PAGE_CSS + HOVER_CSS }} />
      <div ref={v.rootRef} className="khd-root" style={css(`position:fixed;inset:0;overflow:hidden;background:#1d4f4a;--ink:#f8fafc;--muted:#d7e7e4;--accent:#0f766e;--chip:rgba(255,255,255,.92);--chipline:rgba(255,255,255,.6);--chipInk:#0f172a;--chipMuted:#64748b;--hl:linear-gradient(90deg,#fde68a,#fbbf24 50%,#fb923c)`)}>
        <div ref={v.canvasHostRef} style={css(`position:absolute;inset:0`)}></div>
      
        <header style={css(`position:absolute;top:${v.hdTop};left:${v.hdSide};right:${v.hdSide};z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none`)}>
          <a href="/" style={css(`pointer-events:auto;display:flex;align-items:center;gap:10px`)}>
            <img src="/logo.png" alt="KruHeem Logo" style={css(`width:42px;height:42px;border-radius:12px;box-shadow:0 6px 16px -8px rgba(15,23,42,.4)`)} />
            {v.notTiny && (<><div style={css(`display:flex;flex-direction:column;line-height:1`)}>
              <span style={css(`font-weight:800;font-size:17px;color:var(--ink);transition:color .6s`)}>KruHeem</span>
              <span style={css(`font-weight:700;font-size:10px;letter-spacing:.16em;color:var(--muted);margin-top:4px`)}>MATH SCHOOL</span>
            </div></>)}
          </a>
          <div style={css(`pointer-events:auto;display:flex;align-items:center;gap:8px`)}>
            <a href={v.classicUrl} onClick={v.goClassic} title="กลับไปใช้เว็บไซต์เวอร์ชันเดิม" style={css(`height:42px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 14px 0 12px;border-radius:999px;border:1px solid var(--chipline);background:var(--chip);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--chipInk);font-size:13px;font-weight:700;white-space:nowrap;transition:transform .2s`)} className="khd-h0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>
              {v.notSmall && (<><span>เวอร์ชันคลาสสิก</span></>)}
            </a>
            <button onClick={v.toggleMute} aria-label="เปิด/ปิดเสียง" title="เปิด/ปิดเสียง" style={css(`width:42px;height:42px;border-radius:50%;border:1px solid var(--chipline);background:var(--chip);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--chipInk);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s`)} className="khd-h1">
              {v.soundOn && (<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M19 5a10 10 0 0 1 0 14"></path></svg></>)}
              {v.soundOff && (<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"></path><path d="m22 9-6 6"></path><path d="m16 9 6 6"></path></svg></>)}
            </button>
            <button onClick={v.toggleNight} aria-label="โหมดกลางคืน" title="เปิด/ปิดโคมไฟ" style={css(`width:42px;height:42px;border-radius:50%;border:1px solid var(--chipline);background:var(--chip);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--chipInk);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s`)} className="khd-h2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
            </button>
            {v.notSmall && (<><a href="/payment" style={css(`padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600;color:var(--chipInk);background:var(--chip);border:1px solid var(--chipline);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)`)} className="khd-h3">แจ้งโอน</a></>)}
            <a href={v.authHref} style={css(`visibility:${v.authVis};padding:11px 18px;border-radius:999px;font-size:14px;font-weight:700;color:#fff;background:#0f172a;box-shadow:0 4px 0 #334155`)} className="khd-h4">{v.authText}</a>
          </div>
        </header>
      
        {v.noPanel && (<>
          <div ref={v.heroRef} style={css(`opacity:${v.heroOp};transition:opacity .45s;position:absolute;left:16px;right:16px;top:clamp(78px,11vh,112px);z-index:5;display:flex;flex-direction:column;align-items:center;text-align:center;pointer-events:none;animation:khd-fade .9s cubic-bezier(.2,.8,.2,1) backwards`)}>
            
            {/* [พอร์ต] h1 สำหรับ Google ย้ายไปอยู่ในชุดที่เรนเดอร์จากเซิร์ฟเวอร์ (StudyDesk.tsx → DeskSeo) กัน h1 ซ้ำ */}
            <span style={css(`font-weight:700;font-size:clamp(15px,1.3vw,19px);color:var(--muted);margin-bottom:4px`)}>ในขณะที่เรากำลังลังเล...</span>
            <h2 style={css(`margin:0 0 12px;font-family:'Mitr',sans-serif;font-weight:600;font-size:clamp(28px,3.4vw,50px);--khd-lh:1.25;display:flex;flex-wrap:wrap;justify-content:center;column-gap:.3em;color:var(--ink)`)}>
              <span>มีเด็กคนอื่นกำลัง</span>
              <span style={css(`padding-bottom:4px;background:var(--hl);-webkit-background-clip:text;background-clip:text;color:transparent`)}>ก้าวไปข้างหน้า</span>
            </h2>
            <p style={css(`margin:0;display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:var(--muted)`)}>
              <span style={css(`width:8px;height:8px;border-radius:50%;background:#fbbf24;animation:khd-pulse 1.4s ease-in-out infinite`)}></span>แตะอุปกรณ์บนโต๊ะเพื่อเข้าสู่แต่ละเมนู
            </p>
          </div>
        </>)}
      
        <div ref={v.kruRef} style={css(`position:absolute;left:0;top:0;z-index:13;pointer-events:none;opacity:0;transition:opacity .35s;display:flex;flex-direction:row-reverse;align-items:center`)}>
          <div style={css(`max-width:280px;white-space:nowrap;padding:9px 14px;border-radius:16px;background:#fff;color:#0f172a;font-size:14px;font-weight:600;line-height:1.5;box-shadow:0 14px 28px -12px rgba(15,23,42,.45);text-wrap:pretty`)}>{v.kruMsg}</div>
          <span style={css(`width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-right:9px solid #fff;margin-right:-1px`)}></span>
        </div>
        <div ref={v.tipRef} style={css(`position:absolute;left:0;top:0;z-index:15;pointer-events:none;opacity:0;transition:opacity .25s;display:flex;flex-direction:column;align-items:center`)}>
          <div style={css(`display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 16px 11px;border-radius:16px;background:#0f172a;color:#fff;box-shadow:0 18px 36px -14px rgba(15,23,42,.6);white-space:nowrap`)}>
            <span style={css(`font-size:11px;font-weight:700;letter-spacing:.08em;color:#5eead4`)}>{v.tipObj}</span>
            <span style={css(`font-family:'Mitr',sans-serif;font-size:18px;font-weight:500;line-height:1.3`)}>{v.tipTitle}</span>
            <span style={css(`font-size:12px;color:#cbd5e1`)}>{v.tipDesc}</span>
          </div>
          <span style={css(`width:2px;height:30px;background:linear-gradient(#0f172a,rgba(15,23,42,0))`)}></span>
        </div>
      
        {v.noPanel && (<>
          <nav ref={v.dockRef} style={css(`position:absolute;left:clamp(8px,3vw,40px);right:clamp(8px,3vw,40px);bottom:${v.dockBottom};z-index:10;display:flex;justify-content:center;pointer-events:none;animation:khd-fade .9s .2s cubic-bezier(.2,.8,.2,1) both`)}>
            <div className="khd-dock" style={css(`pointer-events:auto;display:flex;gap:4px;padding:6px;border-radius:999px;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:var(--chip);border:1px solid var(--chipline);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 20px 40px -20px rgba(15,23,42,.35);max-width:100%;overflow-x:auto`)}>
              {v.dock.map((m, m_i) => (<React.Fragment key={m_i}>
                {m.on && (<>
                  <button onClick={m.open} onMouseEnter={m.enter} onMouseLeave={m.leave} style={css(`flex:none;display:flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:999px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;color:#fff;background:#0f172a;white-space:nowrap`)}><span style={css(`font-size:11px;color:#5eead4`)}>{m.n}</span>{m.t}</button>
                </>)}
                {m.off && (<>
                  <button onClick={m.open} onMouseEnter={m.enter} onMouseLeave={m.leave} style={css(`flex:none;display:flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:999px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;color:var(--chipInk);background:transparent;white-space:nowrap`)}><span style={css(`font-size:11px;color:var(--chipMuted)`)}>{m.n}</span>{m.t}</button>
                </>)}
              </React.Fragment>))}
            </div>
          </nav>
        </>)}
      
        {v.noGL && (<>
          <div style={css(`position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:26;width:min(420px,calc(100vw - 32px));padding:28px 26px 24px;border-radius:28px;background:#fffdf8;box-shadow:0 40px 80px -30px rgba(0,0,0,.6);text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px`)}>
            <img src="/logo.png" alt="KruHeem" style={css(`width:56px;height:56px;border-radius:16px`)} />
            <h2 style={css(`margin:0;font-family:'Mitr',sans-serif;font-size:22px;font-weight:600;--khd-lh:1.4;color:#0f172a`)}>เครื่องนี้แสดงห้องเรียน 3D ไม่ได้</h2>
            <p style={css(`margin:0;font-size:14px;line-height:1.7;color:#475569;text-wrap:pretty`)}>ยังใช้งานได้ตามปกติ เลือกเมนูจากแถบด้านล่าง หรือไปที่เว็บไซต์เวอร์ชันคลาสสิก</p>
            <a href={v.classicUrl} onClick={v.goClassic} style={css(`margin-top:6px;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:16px;background:#0f766e;color:#fff;font-weight:700;font-size:15px;box-shadow:0 5px 0 #115e59`)} className="khd-h4">ไปเว็บไซต์เวอร์ชันคลาสสิก</a>
          </div>
        </>)}
        {v.slowToast && (<>
          <div style={css(`position:absolute;left:16px;bottom:84px;z-index:27;width:min(340px,calc(100vw - 32px));padding:16px 16px 14px;border-radius:20px;background:#0f172a;color:#fff;box-shadow:0 24px 50px -20px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:10px;animation:khd-fade .5s backwards`)}>
            <div style={css(`display:flex;flex-direction:column;gap:2px`)}><span style={css(`font-size:15px;font-weight:700`)}>เครื่องนี้แสดงผลช้าไปนิด</span><span style={css(`font-size:13px;line-height:1.6;color:#cbd5e1`)}>ลองใช้เวอร์ชันคลาสสิกที่เบากว่าไหมครับ</span></div>
            <div style={css(`display:flex;gap:8px`)}>
              <a href={v.classicUrl} onClick={v.goClassic} style={css(`flex:1;text-align:center;padding:10px;border-radius:12px;background:#fbbf24;color:#0f172a;font-size:13px;font-weight:700`)} className="khd-h5">ไปเวอร์ชันคลาสสิก</a>
              <button onClick={v.dismissSlow} style={css(`flex:1;padding:10px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:transparent;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer`)}>ใช้ต่อ</button>
            </div>
          </div>
        </>)}
        {v.introOn && (<>
          <button onClick={v.skipIntro} style={css(`position:absolute;right:20px;bottom:86px;z-index:40;display:flex;align-items:center;gap:6px;padding:10px 16px;border:1px solid rgba(255,255,255,.6);border-radius:999px;background:rgba(15,23,42,.72);backdrop-filter:blur(10px);color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer`)} className="khd-h6">ข้ามอินโทร ›</button>
        </>)}
        {v.panelOpen && (<>
          <aside style={css(`position:absolute;top:${v.asTop};right:${v.asRight};bottom:${v.asBottom};left:${v.asLeft};width:${v.asWidth};max-height:${v.asMaxH};height:${v.asH};z-index:20;display:flex;flex-direction:column;border-radius:${v.asRadius};background:#fffdf8;box-shadow:0 50px 90px -30px rgba(15,23,42,.5),0 0 0 1px rgba(15,23,42,.05);overflow:hidden;animation:${v.asAnim}`)}>
            {v.isSheet && (<><span style={css(`align-self:center;width:44px;height:5px;border-radius:9px;background:#cbd5e1;margin-top:10px`)}></span></>)}
            <div style={css(`display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:${v.asHeadPad}`)}>
              <div style={css(`display:flex;flex-direction:column;gap:4px`)}>
                <span style={css(`font-size:12px;font-weight:700;letter-spacing:.08em;color:#0d9488`)}>{v.pObj}</span>
                <h2 style={css(`margin:0;font-family:'Mitr',sans-serif;font-weight:600;font-size:26px;--khd-lh:1.3;color:#0f172a`)}>{v.pTitle}</h2>
              </div>
              <button onClick={v.closePanel} aria-label="กลับไปที่โต๊ะ" style={css(`flex:none;display:flex;align-items:center;gap:6px;padding:9px 14px;border:0;border-radius:999px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:#334155;background:#f1f5f9`)} className="khd-h7">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>กลับไปที่โต๊ะ
              </button>
            </div>
            <div style={css(`flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:${v.asBodyPad};display:flex;flex-direction:column;gap:16px`)}>
      
              {v.isCourses && (<>
                <div style={css(`display:flex;flex-wrap:wrap;gap:6px`)}>
                  {v.cats.map((c, c_i) => (<React.Fragment key={c_i}>
                    {c.active && (<><button onClick={c.pick} style={css(`padding:8px 14px;border:0;border-radius:999px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:#fff;background:#0f172a`)}>{c.name}</button></>)}
                    {c.inactive && (<><button onClick={c.pick} style={css(`padding:8px 14px;border:1px solid #e2e8f0;border-radius:999px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:#475569;background:#fff`)} className="khd-h8">{c.name}</button></>)}
                  </React.Fragment>))}
                </div>
                {v.courses.map((k, k_i) => (<React.Fragment key={k_i}>
                  <a href={k.href} style={css(`display:flex;gap:14px;align-items:center;padding:14px;border-radius:22px;background:#fff;border:1px solid #f1f5f9;box-shadow:0 5px 0 #efe9da;color:#1e293b;transition:transform .25s`)} className="khd-h9">
                    <span style={css(`flex:none;width:58px;height:58px;border-radius:16px;background:linear-gradient(135deg,#fffbeb,#fef3c7);color:#d97706;display:flex;align-items:center;justify-content:center`)}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span>
                    <span style={css(`flex:1;min-width:0;display:flex;flex-direction:column;gap:2px`)}>
                      <span style={css(`font-size:16px;font-weight:700;line-height:1.4`)}>{k.title}</span>
                      {k.hasDesc && (<span style={css(`font-size:13px;color:#64748b;line-height:1.5`)}>{k.desc}</span>)}
                    </span>
                    <span style={css(`flex:none;display:flex;flex-direction:column;align-items:flex-end`)}>
                      <span style={css(`font-size:12px;font-weight:700;color:#94a3b8;text-decoration:line-through`)}>{k.full}</span>
                      <span style={css(`font-family:'Mitr',sans-serif;font-size:20px;font-weight:600;color:#0f172a`)}>{k.price}</span>
                    </span>
                  </a>
                </React.Fragment>))}
                <a href="/my-courses" style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:18px;background:linear-gradient(135deg,#14b8a6,#0891b2);color:#fff;font-weight:700;font-size:16px;box-shadow:0 5px 0 #0f766e`)} className="khd-h4">เข้าสู่บทเรียน</a>
              </>)}
      
              {v.isList && (<>
                <p style={css(`margin:0;font-size:15px;line-height:1.7;color:#475569`)}>{v.pDesc}</p>
                {v.hasList && (<span style={css(`font-size:13px;font-weight:700;color:#64748b`)}>อัปเดตล่าสุด</span>)}
                {v.listItems.map((it, it_i) => (<React.Fragment key={it_i}>
                  <a href={it.href} style={css(`display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:20px;background:#fff;border:1px solid #f1f5f9;box-shadow:0 5px 0 #efe9da;color:#1e293b;transition:transform .25s`)} className="khd-h9">
                    <span style={css(`flex:none;font-family:'Mitr',sans-serif;font-weight:600;font-size:18px;color:#0d9488`)}>{it.n}</span>
                    <span style={css(`font-size:15px;font-weight:600;line-height:1.55`)}>{it.t}</span>
                  </a>
                </React.Fragment>))}
                <a href={v.pHref} style={css(`margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:18px;background:#0f172a;color:#fff;font-weight:700;font-size:16px;box-shadow:0 5px 0 #334155`)} className="khd-h4">{v.pCta} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a>
              </>)}
      
              {v.isCountdown && (<>
                <h3 style={css(`margin:0;font-family:'Mitr',sans-serif;font-weight:500;font-size:22px;color:#0f172a`)}>{v.cdTitle}</h3>
                <span style={css(`font-size:14px;font-weight:600;color:#64748b`)}>{v.cdLead}</span>
                <div style={css(`display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px`)}>
                  <div style={css(`display:flex;flex-direction:column;align-items:center;gap:8px`)}><span style={css(`width:100%;box-sizing:border-box;text-align:center;padding:10px 4px;border-radius:18px;background:#fff;font-family:'Mitr',sans-serif;font-weight:600;font-size:34px;line-height:1.2;font-variant-numeric:tabular-nums;color:#0f172a;box-shadow:0 6px 0 #e4ddcb`)}>{v.cdD}</span><span style={css(`font-size:12px;font-weight:600;color:#64748b`)}>วัน</span></div>
                  <div style={css(`display:flex;flex-direction:column;align-items:center;gap:8px`)}><span style={css(`width:100%;box-sizing:border-box;text-align:center;padding:10px 4px;border-radius:18px;background:#fff;font-family:'Mitr',sans-serif;font-weight:600;font-size:34px;line-height:1.2;font-variant-numeric:tabular-nums;color:#0f172a;box-shadow:0 6px 0 #e4ddcb`)}>{v.cdH}</span><span style={css(`font-size:12px;font-weight:600;color:#64748b`)}>ชั่วโมง</span></div>
                  <div style={css(`display:flex;flex-direction:column;align-items:center;gap:8px`)}><span style={css(`width:100%;box-sizing:border-box;text-align:center;padding:10px 4px;border-radius:18px;background:#fff;font-family:'Mitr',sans-serif;font-weight:600;font-size:34px;line-height:1.2;font-variant-numeric:tabular-nums;color:#0f172a;box-shadow:0 6px 0 #e4ddcb`)}>{v.cdM}</span><span style={css(`font-size:12px;font-weight:600;color:#64748b`)}>นาที</span></div>
                  <div style={css(`display:flex;flex-direction:column;align-items:center;gap:8px`)}><span style={css(`width:100%;box-sizing:border-box;text-align:center;padding:10px 4px;border-radius:18px;background:#0f766e;font-family:'Mitr',sans-serif;font-weight:600;font-size:34px;line-height:1.2;font-variant-numeric:tabular-nums;color:#fff;box-shadow:0 6px 0 #115e59`)}>{v.cdS}</span><span style={css(`font-size:12px;font-weight:600;color:#64748b`)}>วินาที</span></div>
                </div>
                {v.cdShowProgress && (<div style={css(`display:flex;align-items:center;gap:10px;margin-top:8px`)}>
                  <div style={css(`flex:1;height:8px;border-radius:99px;background:rgba(15,23,42,.08);overflow:hidden`)}><div style={css(`height:100%;min-width:8px;width:${v.cdPct};border-radius:99px;background:linear-gradient(90deg,#14b8a6,#0891b2)`)}></div></div>
                  <span style={css(`font-size:12px;font-weight:700;color:#0f766e`)}>{v.cdPctText}%</span>
                </div>)}
                {v.cdShowQuote && (<p style={css(`margin:6px 0 0;padding:18px 20px;border-radius:20px;background:#f0fdfa;font-family:'Mitr',sans-serif;font-size:18px;line-height:1.6;color:#115e59;text-wrap:pretty`)}>“{v.quote}”</p>)}
              </>)}
      
              {v.isReviews && (<>
                <p style={css(`margin:0;font-size:15px;line-height:1.7;color:#475569`)}>ผลตอบรับจริงจากน้องๆ และคุณพ่อคุณแม่ ที่ติดไว้บนกระดานของครูฮีม</p>
                <div style={css(`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 14px;padding:4px 2px`)}>
                  {v.reviews.map((r, r_i) => (<React.Fragment key={r_i}>
                    {r.kid && (<>
                      <div style={css(`position:relative;display:flex;flex-direction:column;gap:8px;padding:22px 16px 16px;background:#fde68a;border-radius:2px 2px 14px 2px;box-shadow:0 14px 22px -14px rgba(120,80,0,.55);transform:rotate(-1.4deg)`)}>
                        <span style={css(`position:absolute;top:-7px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#ef4444;box-shadow:0 2px 3px rgba(0,0,0,.3)`)}></span>
                        {r.hasC && (<span style={css(`align-self:flex-start;padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.6);color:#92400e;font-size:11px;font-weight:700`)}>{r.c}</span>)}
                        <span style={css(`font-family:'Itim',cursive;font-size:21px;line-height:1.35;color:#0f172a`)}>{r.q}</span>
                        {r.hasT && (<span style={css(`font-size:13px;line-height:1.6;color:#57534e`)}>{r.t}</span>)}
                        <span style={css(`margin-top:auto;font-family:'Itim',cursive;font-size:16px;color:#b45309`)}>— {r.n}</span>
                        <span style={css(`font-size:12px;font-weight:600;color:#d97706;letter-spacing:.08em`)}>{r.starText}</span>
                      </div>
                    </>)}
                    {r.parent && (<>
                      <div style={css(`position:relative;display:flex;flex-direction:column;gap:8px;padding:22px 16px 16px;background:#fbcfe8;border-radius:2px 2px 14px 2px;box-shadow:0 14px 22px -14px rgba(131,24,67,.5);transform:rotate(1.2deg)`)}>
                        <span style={css(`position:absolute;top:-7px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#0f766e;box-shadow:0 2px 3px rgba(0,0,0,.3)`)}></span>
                        {r.hasC && (<span style={css(`align-self:flex-start;padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.6);color:#9d174d;font-size:11px;font-weight:700`)}>{r.c}</span>)}
                        <span style={css(`font-family:'Itim',cursive;font-size:21px;line-height:1.35;color:#0f172a`)}>{r.q}</span>
                        {r.hasT && (<span style={css(`font-size:13px;line-height:1.6;color:#57534e`)}>{r.t}</span>)}
                        <span style={css(`margin-top:auto;font-family:'Itim',cursive;font-size:16px;color:#be185d`)}>— {r.n}</span>
                        <span style={css(`font-size:12px;font-weight:600;color:#d97706;letter-spacing:.08em`)}>{r.starText}</span>
                      </div>
                    </>)}
                  </React.Fragment>))}
                </div>
                <a href="/reviews" style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:18px;background:#0f172a;color:#fff;font-weight:700;font-size:16px;box-shadow:0 5px 0 #334155`)} className="khd-h4">ดูรีวิวทั้งหมด</a>
              </>)}
      
              {v.isStory && (<>
                <div style={css(`display:flex;flex-direction:column;gap:18px;font-size:16px;line-height:1.9;color:#334155`)}>
                  <h3 style={css(`margin:0;font-family:'Mitr',sans-serif;font-weight:600;font-size:24px;--khd-lh:1.45;color:#0f172a`)}>ผมเคยเกือบยอมแพ้...<br /><span style={css(`color:#d97706`)}>จนวันที่ค้นพบ "ความจริง" ของการเรียนเลขให้เก่ง</span></h3>
                  <p style={css(`margin:0`)}>เชื่อไหมครับว่าครั้งหนึ่ง ผมเคยนั่งจ้องโจทย์เลขแล้วในหัวว่างเปล่า เหมือนที่น้องๆ หลายคนเป็น ผมเคยรู้สึกว่าตัวเองหัวช้า ไม่เก่งเหมือนเพื่อน เคยแม้กระทั่งคิดว่า <span style={css(`font-style:italic;color:#64748b`)}>"เราคงไม่มีพรสวรรค์ด้านนี้"</span> ทุกครั้งที่เห็นข้อสอบ ผมจะเข้าไป "นั่งคิด" ว่าจะเริ่มยังไงดี? จะใช้สูตรไหน? เอ๊ะ... แบบนี้จะใช่ไหมหนอ? สุดท้ายก็ทำไม่เคยทัน แถมที่ทำไปก็ผิด</p>
                  <p style={css(`margin:0`)}>จนวันหนึ่งที่ผมทนความรู้สึกนั้นไม่ไหว ผมตัดสินใจลุกขึ้นมา "ลองผิด" ด้วยตัวเอง และนั่นคือจุดที่ผมค้นพบความจริงว่า...</p>
                  <p style={css(`margin:0;padding:20px;border-radius:20px;background:#fffbeb;font-family:'Mitr',sans-serif;font-size:20px;line-height:1.6;color:#92400e;text-align:center`)}>"การเรียนเลขให้เก่ง ไม่ได้จบที่โรงเรียน... แต่มันเริ่มต้นที่บ้าน"</p>
                  <p style={css(`margin:0`)}>ผมเปลี่ยนวิธีทบทวนใหม่หมด หลังเลิกเรียน ผมจะเอาทุกสิ่งที่เรียนในวันนั้นมา <strong style={css(`color:#0f172a`)}>"เขียนใหม่ด้วยลายมือตัวเอง"</strong> ตั้งแต่อายุ คุณสมบัติ ไปจนถึงกลเม็ดคิดลัด จากนั้นก็ <strong style={css(`color:#0f172a`)}>"ลบแล้วทำซ้ำ"</strong> วันแรก 10 ข้อ ผมอาจทำถูกแค่ 6 ข้อ แต่ผมไม่ท้อ ข้อไหนผิด ผมเปิดดู... แล้วทำใหม่ วันต่อมา ผมก็ทำแบบเดิมอีกครั้ง</p>
                  <p style={css(`margin:0`)}>ผมเพิ่งเข้าใจในวันนั้นเองว่า การเรียนมันเหมือน <span style={css(`color:#d97706;font-weight:700`)}>"การเติมน้ำใส่แก้วก้นรั่ว"</span> เราจะเติมบ้างหยุดบ้างไม่ได้ เพราะน้ำจะรั่วออกหมด เสียเวลาเปล่า เราต้องเติมให้ต่อเนื่องและมากพอจนมันล้นออกมา</p>
                  <p style={css(`margin:0`)}>และแล้ววันที่น่าอัศจรรย์ก็มาถึง... วันที่ผมเห็นข้อสอบแล้วไม่ได้ "นั่งคิด" แต่ผม <strong style={css(`color:#0f172a`)}>"ลงมือทำ"</strong> ทันที... โดยอัตโนมัติ! สมองมันร้องอ๋อออกมาเองว่า "ข้อนี้น่ะเหรอ? เคยทำมาแล้ว!"</p>
                  <p style={css(`margin:0`)}>ผมจึงได้รู้ความลับข้อที่ใหญ่ที่สุดว่า คนที่เตรียมตัวมาพร้อม เขาไม่ได้เข้าไปนั่งคิดในห้องสอบครับ เขาเข้าไปนั่งทำอย่างเดียว! ประสบการณ์ครั้งนั้นเปลี่ยนชีวิตผมไปตลอดกาล มันทำให้ผมรู้ว่าความสำเร็จไม่ได้มาจากพรสวรรค์ ไม่ได้มาจากความฝันที่สวยหรู ไม่ใช่เรื่องของคนเรียนๆ เล่นๆ แล้วจะทำได้ แต่มันมาจาก <strong style={css(`color:#0f172a`)}>"ความมานะพยายามอย่างต่อเนื่อง"</strong></p>
                  <p style={css(`margin:0;color:#64748b;text-align:center`)}>และนี่คือแก่นของเทคนิคทั้งหมดที่ผมใช้สอนน้องๆ ที่ครูฮีม... เพราะผมเชื่อสุดหัวใจว่า</p>
                  <p style={css(`margin:0;font-family:'Mitr',sans-serif;font-weight:600;font-size:24px;line-height:1.45;text-align:center;background:linear-gradient(90deg,#d97706,#ea580c);-webkit-background-clip:text;background-clip:text;color:transparent`)}>คณิตศาสตร์ไม่ยาก... ยากเฉพาะคนไม่ลงมือทำ</p>
                </div>
              </>)}
      
              {v.isMy && (<>
                <p style={css(`margin:0;font-size:15px;line-height:1.7;color:#475569`)}>{v.pDesc}</p>
                {/* [พอร์ต] ยังไม่ล็อกอิน: การ์ดตัวอย่าง (ต้นแบบเขียน "กำลังเรียน" คอร์สสมมติ — ติดป้าย "ตัวอย่าง" แทน) */}
                {v.myGuest && (<>
                  <div style={css(`display:flex;flex-direction:column;gap:12px;padding:20px 22px;border-radius:8px 8px 24px 8px;background-color:#fffdf7;background-image:repeating-linear-gradient(transparent 0 31px,rgba(56,189,248,.22) 31px 32px);box-shadow:inset 3px 0 0 rgba(244,63,94,.4),0 16px 30px -18px rgba(15,23,42,.35)`)}>
                    <span style={css(`align-self:flex-start;padding:4px 12px;border-radius:999px;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700`)}>ตัวอย่าง</span>
                    <span style={css(`font-family:'Mitr',sans-serif;font-size:21px;font-weight:600;line-height:1.35;color:#0f172a`)}>ห้องเรียนออนไลน์ของครูฮีม</span>
                    <span style={css(`font-family:'Itim',cursive;font-size:19px;color:#1d4ed8`)}>บทที่ 3 · สมการเชิงเส้น</span>
                    <div style={css(`display:flex;align-items:center;gap:10px`)}>
                      <div style={css(`flex:1;height:10px;border-radius:99px;background:rgba(15,23,42,.08);overflow:hidden`)}><div style={css(`width:25%;height:100%;border-radius:99px;background:linear-gradient(90deg,#14b8a6,#0891b2)`)}></div></div>
                      <span style={css(`font-size:12px;font-weight:700;color:#0f766e`)}>3 จาก 12 บท</span>
                    </div>
                    <a href="/login" style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:16px;background:#fbbf24;color:#0f172a;font-weight:700;font-size:16px;box-shadow:0 5px 0 #b45309`)} className="khd-h5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>เข้าสู่ระบบเพื่อเรียนต่อ
                    </a>
                  </div>
                  <div style={css(`display:flex;flex-direction:column;gap:8px`)}>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between`)}>
                      <span style={css(`font-size:13px;font-weight:700;color:#64748b`)}>ตัวอย่างบทเรียน</span>
                      <span style={css(`display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#b45309`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:#ef4444;animation:khd-pulse 1.2s ease-in-out infinite`)}></span>กำลังเล่นบนจอ</span>
                    </div>
                    <div style={css(`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#fff;border:1px solid #f1f5f9`)}>
                      <span style={css(`flex:none;width:30px;height:30px;border-radius:10px;background:#f1f5f9;color:#0f172a;display:flex;align-items:center;justify-content:center;font-family:'Mitr',sans-serif;font-weight:600;font-size:14px`)}>1</span>
                      <span style={css(`flex:1;font-size:15px;font-weight:600;color:#1e293b`)}>จำนวนและตัวเลข</span>
                      <span style={css(`font-size:12px;font-weight:700;color:#059669`)}>✓ 10:24</span>
                    </div>
                    <div style={css(`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#fff;border:1px solid #f1f5f9`)}>
                      <span style={css(`flex:none;width:30px;height:30px;border-radius:10px;background:#f1f5f9;color:#0f172a;display:flex;align-items:center;justify-content:center;font-family:'Mitr',sans-serif;font-weight:600;font-size:14px`)}>2</span>
                      <span style={css(`flex:1;font-size:15px;font-weight:600;color:#1e293b`)}>เศษส่วนและทศนิยม</span>
                      <span style={css(`font-size:12px;font-weight:700;color:#059669`)}>✓ 12:05</span>
                    </div>
                    <div style={css(`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#fffbeb;border:1px solid #fde68a`)}>
                      <span style={css(`flex:none;width:30px;height:30px;border-radius:10px;background:#fbbf24;color:#0f172a;display:flex;align-items:center;justify-content:center;font-family:'Mitr',sans-serif;font-weight:600;font-size:14px`)}>3</span>
                      <span style={css(`flex:1;font-size:15px;font-weight:700;color:#1e293b`)}>สมการเชิงเส้น</span>
                      <span style={css(`display:flex;align-items:flex-end;gap:3px;height:16px`)}><span style={css(`width:4px;height:16px;border-radius:2px;background:#f59e0b;transform-origin:bottom;animation:khd-eq .9s ease-in-out infinite`)}></span><span style={css(`width:4px;height:16px;border-radius:2px;background:#f59e0b;transform-origin:bottom;animation:khd-eq .9s .3s ease-in-out infinite`)}></span><span style={css(`width:4px;height:16px;border-radius:2px;background:#f59e0b;transform-origin:bottom;animation:khd-eq .9s .6s ease-in-out infinite`)}></span></span>
                    </div>
                    <div style={css(`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#fff;border:1px solid #f1f5f9`)}>
                      <span style={css(`flex:none;width:30px;height:30px;border-radius:10px;background:#f1f5f9;color:#0f172a;display:flex;align-items:center;justify-content:center;font-family:'Mitr',sans-serif;font-weight:600;font-size:14px`)}>4</span>
                      <span style={css(`flex:1;font-size:15px;font-weight:600;color:#1e293b`)}>อัตราส่วนและร้อยละ</span>
                      <span style={css(`font-size:12px;font-weight:600;color:#94a3b8`)}>14:30</span>
                    </div>
                  </div>
                  <a href="/my-courses" style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:18px;background:linear-gradient(135deg,#14b8a6,#0891b2);color:#fff;font-weight:700;font-size:16px;box-shadow:0 5px 0 #0f766e`)} className="khd-h4">ดูคอร์สของฉันทั้งหมด</a>
                  <a href="/register" style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:18px;background:#0f172a;color:#fff;font-weight:700;font-size:16px;box-shadow:0 5px 0 #334155`)} className="khd-h4">สมัครสมาชิกใหม่</a>
                </>)}
                {/* [พอร์ต] ล็อกอินแล้ว: บทที่เรียนค้างไว้จริง (users/{uid}/course_states) + คอร์สที่อนุมัติแล้ว */}
                {v.myUser && (<>
                  {v.myFetching && (
                  <div style={css(`display:flex;flex-direction:column;gap:12px;padding:20px 22px;border-radius:8px 8px 24px 8px;background-color:#fffdf7;background-image:repeating-linear-gradient(transparent 0 31px,rgba(56,189,248,.22) 31px 32px);box-shadow:inset 3px 0 0 rgba(244,63,94,.4),0 16px 30px -18px rgba(15,23,42,.35)`)}>
                    <span style={css(`align-self:flex-start;padding:4px 12px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:700`)}>กำลังโหลด</span>
                    <span style={css(`font-size:15px;line-height:1.7;color:#475569`)}>กำลังเปิดบทที่เรียนค้างไว้…</span>
                  </div>)}
                  {v.myError && (
                  <div style={css(`display:flex;flex-direction:column;gap:12px;padding:20px 22px;border-radius:8px 8px 24px 8px;background-color:#fffdf7;background-image:repeating-linear-gradient(transparent 0 31px,rgba(56,189,248,.22) 31px 32px);box-shadow:inset 3px 0 0 rgba(244,63,94,.4),0 16px 30px -18px rgba(15,23,42,.35)`)}>
                    <span style={css(`font-size:15px;line-height:1.7;color:#475569`)}>ยังโหลดคอร์สของคุณไม่สำเร็จ ลองกด "ดูคอร์สของฉันทั้งหมด" ด้านล่างได้เลยครับ</span>
                  </div>)}
                  {v.hasResume && (
                  <div style={css(`display:flex;flex-direction:column;gap:12px;padding:20px 22px;border-radius:8px 8px 24px 8px;background-color:#fffdf7;background-image:repeating-linear-gradient(transparent 0 31px,rgba(56,189,248,.22) 31px 32px);box-shadow:inset 3px 0 0 rgba(244,63,94,.4),0 16px 30px -18px rgba(15,23,42,.35)`)}>
                    <span style={css(`align-self:flex-start;padding:4px 12px;border-radius:999px;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700`)}>เรียนค้างไว้</span>
                    <span style={css(`font-family:'Mitr',sans-serif;font-size:21px;font-weight:600;line-height:1.35;color:#0f172a`)}>{v.rsCourse}</span>
                    {v.hasRsLesson && (                  <span style={css(`font-family:'Itim',cursive;font-size:19px;color:#1d4ed8`)}>{v.rsLesson}</span>)}
                    {v.hasRsPct && (
                      <div style={css(`display:flex;align-items:center;gap:10px`)}>
                        <div style={css(`flex:1;height:10px;border-radius:99px;background:rgba(15,23,42,.08);overflow:hidden`)}><div style={css(`width:${v.rsPct};height:100%;border-radius:99px;background:linear-gradient(90deg,#14b8a6,#0891b2)`)}></div></div>
                        <span style={css(`font-size:12px;font-weight:700;color:#0f766e`)}>{v.rsPctText}</span>
                      </div>
                    )}
                    <a href={v.rsHref} style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:16px;background:#fbbf24;color:#0f172a;font-weight:700;font-size:16px;box-shadow:0 5px 0 #b45309`)} className="khd-h5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>เรียนต่อจากที่ค้างไว้
                    </a>
                  </div>)}
                  {v.hasMyCourses && (<div style={css(`display:flex;flex-direction:column;gap:8px`)}>
                    <span style={css(`font-size:13px;font-weight:700;color:#64748b`)}>คอร์สที่ลงทะเบียนไว้</span>
                    {v.myCourses.map((c, c_i) => (<a key={c_i} href={c.href} style={css(`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#fff;border:1px solid #f1f5f9;color:#1e293b;transition:transform .25s`)} className="khd-h9">
                      <span style={css(`flex:1;font-size:15px;font-weight:600`)}>{c.title}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </a>))}
                  </div>)}
                  {v.noMyCourses && (
                  <div style={css(`display:flex;flex-direction:column;gap:12px;padding:20px 22px;border-radius:8px 8px 24px 8px;background-color:#fffdf7;background-image:repeating-linear-gradient(transparent 0 31px,rgba(56,189,248,.22) 31px 32px);box-shadow:inset 3px 0 0 rgba(244,63,94,.4),0 16px 30px -18px rgba(15,23,42,.35)`)}>
                    <span style={css(`font-size:15px;line-height:1.7;color:#475569`)}>ยังไม่มีคอร์สที่เปิดใช้งานในบัญชีนี้ครับ เลือกคอร์สที่ใช่ได้จากตั้งหนังสือบนโต๊ะ</span>
                    <button onClick={v.openCourses} style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border:0;border-radius:16px;cursor:pointer;font-family:inherit;background:#fbbf24;color:#0f172a;font-weight:700;font-size:16px;box-shadow:0 5px 0 #b45309`)}>ดูคอร์สเรียนทั้งหมด</button>
                  </div>)}
                  <a href="/my-courses" style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:18px;background:linear-gradient(135deg,#14b8a6,#0891b2);color:#fff;font-weight:700;font-size:16px;box-shadow:0 5px 0 #0f766e`)} className="khd-h4">ดูคอร์สของฉันทั้งหมด</a>
                </>)}
                {v.myLoading && (<span style={css(`font-size:14px;color:#94a3b8`)}>กำลังตรวจสอบบัญชี…</span>)}
              </>)}
      
              {v.isContact && (<>
                <div style={css(`display:flex;align-items:center;gap:14px;padding:16px;border-radius:22px;background:#f0fdfa`)}>
                  <img src="/assets/kruheem_avatar.png" alt="ครูฮีม" style={css(`flex:none;width:64px;height:64px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:0 0 0 3px #fff`)} />
                  <div style={css(`display:flex;flex-direction:column;gap:2px`)}>
                    <span style={css(`font-family:'Mitr',sans-serif;font-size:21px;font-weight:600;color:#0f172a`)}>ครูฮีม</span>
                    <span style={css(`font-size:13px;color:#475569`)}>มีคำถามเรื่องคอร์สหรือการสมัคร ทักมาได้เลยครับ</span>
                  </div>
                </div>
                  <a href="https://line.me/ti/p/~kruheemschool" target="_blank" rel="noreferrer" style={css(`display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:#fff;border:1px solid #f1f5f9;box-shadow:0 5px 0 #efe9da;color:#0f172a;transition:transform .25s`)} className="khd-h10">
                    <span style={css(`flex:none;width:44px;height:44px;border-radius:14px;background:#06c755;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px`)}>LINE</span>
                    <span style={css(`flex:1;min-width:0;display:flex;flex-direction:column;gap:1px`)}><span style={css(`font-size:16px;font-weight:700`)}>LINE</span><span style={css(`font-size:13px;color:#64748b`)}>~kruheemschool</span></span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </a>
                  <a href="https://www.facebook.com/kruheem.math/" target="_blank" rel="noreferrer" style={css(`display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:#fff;border:1px solid #f1f5f9;box-shadow:0 5px 0 #efe9da;color:#0f172a;transition:transform .25s`)} className="khd-h10">
                    <span style={css(`flex:none;width:44px;height:44px;border-radius:14px;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px`)}>f</span>
                    <span style={css(`flex:1;min-width:0;display:flex;flex-direction:column;gap:1px`)}><span style={css(`font-size:16px;font-weight:700`)}>Facebook</span><span style={css(`font-size:13px;color:#64748b`)}>kruheem.math</span></span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </a>
            {/* [พอร์ต] Instagram / TikTok ยังไม่มีลิงก์จริง (ต้นแบบเป็น href="#") — ใส่ลิงก์แล้วค่อยเพิ่มสองแถวนี้กลับ */}
                  <a href="mailto:kruheemschool@gmail.com" style={css(`display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:#fff;border:1px solid #f1f5f9;box-shadow:0 5px 0 #efe9da;color:#0f172a;transition:transform .25s`)} className="khd-h10">
                    <span style={css(`flex:none;width:44px;height:44px;border-radius:14px;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px`)}>@</span>
                    <span style={css(`flex:1;min-width:0;display:flex;flex-direction:column;gap:1px`)}><span style={css(`font-size:16px;font-weight:700`)}>Email</span><span style={css(`font-size:13px;color:#64748b`)}>kruheemschool@gmail.com</span></span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </a>
              </>)}
      
              {v.isApply && (<>
                <h3 style={css(`margin:0;font-family:'Mitr',sans-serif;font-weight:600;font-size:22px;--khd-lh:1.4;color:#0f172a`)}>ทางเลือกมีแค่ 2 ทาง... อยู่ที่คุณจะเลือก</h3>
                <div onClick={v.openModal} style={css(`cursor:pointer;display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:24px;background:#fff;border:1px solid #fecaca;box-shadow:0 5px 0 #fee2e2;transition:transform .25s`)} className="khd-h11">
                  <span style={css(`align-self:flex-start;padding:4px 12px;border-radius:999px;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:700`)}>เส้นทางเดิม</span>
                  <span style={css(`font-family:'Mitr',sans-serif;font-size:19px;font-weight:600;color:#1e293b`)}>ปล่อยให้ปัญหาคาราคาซัง</span>
                  <span style={css(`font-size:14px;line-height:1.8;color:#64748b`)}>ความสับสนและความกังวลกัดกินใจน้องต่อไป · ปล่อยให้เขาเผชิญโจทย์ที่ไม่เข้าใจอยู่ลำพัง · ความมั่นใจลดลง เลือนหายจนกลัวการถาม · ช่องว่างกับเพื่อนห่างขึ้นเรื่อยๆ จนตามไม่ทัน</span>
                  <span style={css(`font-size:14px;font-weight:700;color:#ef4444`)}>เลือกเส้นทางนี้ (ไม่แนะนำ)</span>
                </div>
                <div style={css(`display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:24px;background:linear-gradient(160deg,#ffffff,#ecfdf5);border:2px solid #a7f3d0;box-shadow:0 6px 0 #6ee7b7`)}>
                  <span style={css(`align-self:flex-start;padding:4px 12px;border-radius:999px;background:#d1fae5;color:#047857;font-size:12px;font-weight:700`)}>ทางเลือกสำหรับผู้ชนะ</span>
                  <span style={css(`font-family:'Mitr',sans-serif;font-size:19px;font-weight:600;color:#047857`)}>เส้นทางสู่ความสำเร็จที่แน่นอน</span>
                  <div style={css(`display:flex;flex-direction:column;gap:8px;font-size:15px;font-weight:500;color:#334155`)}>
                    <span>✓ ระบบที่พิสูจน์แล้วว่าได้ผลจริง (Proven System)</span>
                    <span>✓ ประหยัดเวลาลองผิดลองถูกไปหลายร้อยชั่วโมง</span>
                    <span>✓ สร้างความมั่นใจถาวร ด้วยแผนการที่ชัดเจน</span>
                    <span>✓ ทักษะติดตัวไปตลอดชีวิต (Lifetime Skill)</span>
                  </div>
                  <a href="/payment" style={css(`display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:18px;background:linear-gradient(135deg,#10b981,#0d9488);color:#fff;font-weight:700;font-size:16px;box-shadow:0 5px 0 #047857`)} className="khd-h4">เลือกเส้นทางสู่ความสำเร็จ</a>
                  <span style={css(`text-align:center;font-size:13px;color:#059669`)}>*รับประกันความพอใจ 100%</span>
                </div>
                <div style={css(`display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px`)}>
                  <a href="/how-to-apply" style={css(`padding:14px 8px;border-radius:16px;background:#f8fafc;text-align:center;font-size:14px;font-weight:700;color:#334155`)} className="khd-h12">วิธีสมัคร</a>
                  <a href="/payment" style={css(`padding:14px 8px;border-radius:16px;background:#f8fafc;text-align:center;font-size:14px;font-weight:700;color:#334155`)} className="khd-h12">แจ้งโอน</a>
                  <a href="/faq" style={css(`padding:14px 8px;border-radius:16px;background:#f8fafc;text-align:center;font-size:14px;font-weight:700;color:#334155`)} className="khd-h12">คำถามที่พบบ่อย</a>
                </div>
              </>)}
            </div>
          </aside>
        </>)}
      
        {v.modal && (<>
          <div style={css(`position:absolute;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:16px`)}>
            <div onClick={v.closeModal} style={css(`position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px)`)}></div>
            <div style={css(`position:relative;max-width:400px;width:100%;padding:34px 30px 30px;border-radius:30px;background:#fff;text-align:center;animation:khd-fade .4s both`)}>
              <h3 style={css(`margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b`)}>คุณเลือกเส้นทางเดิม?</h3>
              <p style={css(`margin:0 0 24px;color:#475569;line-height:1.7`)}>ถ้ายังไม่พร้อมจะเปลี่ยนอนาคต... งั้นไปพักผ่อนเล่นเกมก่อนก็ได้ครับ</p>
              <a href="https://www.roblox.com" target="_blank" rel="noopener noreferrer" onClick={v.closeModal} style={css(`display:block;padding:14px;border-radius:16px;background:#ef4444;color:#fff;font-weight:700;box-shadow:0 5px 0 #b91c1c`)} className="khd-h4">ไปเล่น Roblox แก้เครียด</a>
            </div>
          </div>
        </>)}
      </div>
      </>
    );
  }
}

export default StudyDeskScene;
