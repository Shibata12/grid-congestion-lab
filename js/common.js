/* ============================================================
   系統混雑ラボ  共通機能（common.js）
   - SITE_STRUCTURE（サイト構成データ / 第8章 8.6）
   - グローバルナビゲーションの動的生成（第5章 5.3）
   - 学習進捗の保存・取得（localStorage / 第8章）
   - トップページ・領域トップページの動的レンダリング
   - 数式（KaTeX）のレンダリングとフォールバック
   exercise-engine.js からは window.GCL 経由で進捗関数を使う。
   ※ file:// 直接オープンを全ブラウザで動作させるため、ES Modules ではなく
     クラシックスクリプト＋名前空間（window.GCL）方式を採用（DESIGN.md 2.1）。
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     Google Analytics (gtag.js) — 全ページ共通で読み込む。
     file:// では計測しない（オフライン方針 / DESIGN 2.4）。
     ------------------------------------------------------------ */
  (function initAnalytics() {
    var GA_ID = 'G-VBZC8FEWJK';
    if (location.protocol === 'file:') return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  })();

  /* ------------------------------------------------------------
     favicon（第6章 6.5）— SVG data URI を動的挿入する。
     各HTMLへの<link>追加を不要にし、更新箇所を1ファイルに集約する
     （ナビ生成・フッター注記と同じ方針）。
     図柄: 2本の母線をつなぐ送電線と、混雑地点を示す琥珀色の点。
     ------------------------------------------------------------ */
  (function initFavicon() {
    if (document.querySelector('link[rel~="icon"]')) return;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
      + '<rect width="64" height="64" rx="12" fill="#2563eb"/>'
      + '<rect x="12" y="14" width="40" height="6" rx="3" fill="#fff"/>'
      + '<rect x="12" y="44" width="40" height="6" rx="3" fill="#fff"/>'
      + '<path d="M25 20 L39 44" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
      + '<circle cx="32" cy="32" r="6" fill="#f59e0b"/>'
      + '</svg>';
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.head.appendChild(link);
  })();

/* ------------------------------------------------------------
   サイト構成データ（第8章 8.6）
   新ユニット追加時はこのオブジェクトを更新する（第9章 9.4）。
   - folder : 領域フォルダ名（units/ 直下）
   - summary: 領域・ユニットの概要（1〜2文）
   - units[].file: 領域フォルダ内のHTMLファイル名
   ------------------------------------------------------------ */
const SITE_STRUCTURE = {
  a: {
    name: '系統の基礎',
    folder: 'a-grid-fundamentals',
    summary: '電力系統を理解するための物理法則。オームの法則、キルヒホッフの法則、潮流の基礎を扱う。',
    units: [
      { id: 'a-01', title: 'オームの法則とキルヒホッフの法則', file: '01-kirchhoff.html', exerciseCount: 5,
        summary: 'オームの法則(V=R·I)と、キルヒホッフの電流則(KCL)・電圧則(KVL)を、系統解析の出発点として理解する。' },
      { id: 'a-02', title: '潮流計算の基礎', file: '02-power-flow-basics.html', exerciseCount: 5,
        summary: '母線への注入と、放射状・ループ系統での潮流の決まり方を学ぶ。発電計画値が潮流計算の入力になる。' },
      { id: 'a-03', title: 'インピーダンスとリアクタンス', file: '03-impedance-reactance.html', exerciseCount: 4,
        summary: '交流回路の視点から抵抗・リアクタンス・インピーダンスの関係を概念的に整理し、なぜ送電線でリアクタンスが支配的かを学ぶ。A-02の“電気的な距離”の裏付け。' },
      { id: 'a-04', title: '有効電力・無効電力と電圧', file: '04-active-reactive-voltage.html', exerciseCount: 4,
        summary: '有効・無効・皮相電力の関係（電力の三角形）と力率を押さえ、無効電力が電圧を支えること、電圧・無効電力の制約が熱容量とは別の混雑要因になることを学ぶ。A-03で預けた無効電力の回収。' },
      { id: 'a-05', title: '三相交流と単位法（per-unit）', file: '05-three-phase-and-per-unit.html', exerciseCount: 3,
        summary: '送電線が3本1組（1回線）である理由と、電圧は線間・電力は3相合計という表記の約束、実務データを読むための単位法（pu＝値÷基準値）・%インピーダンスを学ぶ。A領域本編の締めくくり。' },
      { id: 'a-06', title: '発電機のきほん──種類・特性・SCUCに現れる制約', file: '06-generator-basics.html', exerciseCount: 4,
        summary: '発展編。電源の種類（役割分担）、同期発電機とインバータ電源、運転の3制約（起動時間・最低出力・ランプ）、メリットオーダーの出所を学び、SCUC/SCEDの制約の物理的な出所を回収する。D-03・D-08の土台。' },
      { id: 'a-07', title: '周波数と慣性──なぜ50Hzに保てるのか', file: '07-frequency-and-inertia.html', exerciseCount: 4,
        summary: '発展編。需給のずれが周波数に出るからくり（回転エネルギーの貯金箱）と、慣性＝時間を稼ぐ第0走者、RoCoF、インバータ電源の増加による慣性低下と対策（グリッドフォーミング等）を学ぶ。F-05・B-04の物理的裏付け。' },
      { id: 'a-08', title: '送電容量の物理──熱容量はどう決まるか', file: '08-thermal-capacity.html', exerciseCount: 4,
        summary: '発展編。熱容量の正体＝発熱（I²R）と放熱（気温・風）のつり合いで決まる温度の限度。許容電流→MW換算（√3・A-05回収）、短時間許容とN-1運用、季節別容量と動的レーティング（DLR）まで。B-01の「容量」の種明かし。' },
    ],
  },
  b: {
    name: '系統混雑',
    folder: 'b-congestion',
    summary: '送電線の容量制約により電力を流しきれなくなる「混雑」とは何か、なぜ起きるのかを学ぶ。',
    units: [
      { id: 'b-01', title: '混雑の判定とN-1基準', file: '01-congestion-and-n1.html', exerciseCount: 3,
        summary: '潮流が送電容量を超えるかの判定と、単一設備故障を想定するN-1基準を学ぶ。' },
      { id: 'b-02', title: '運用容量とマージン', file: '02-operating-capacity-and-margin.html', exerciseCount: 3,
        summary: '運用容量が4つの限度の最小値で決まること、マージン・空き容量の内訳、地内混雑と連系線混雑の違いを学ぶ。B-01で預けた「送電容量の区別」の回収。' },
      { id: 'b-03', title: '混雑対策の全体地図──運用・接続・増強', file: '03-congestion-countermeasures-map.html', exerciseCount: 3,
        summary: '混雑への打ち手を「運用でしのぐ／枠を賢く使う（コネクト&マネージ3本柱）／設備を増やす（増強・マスタープラン）」の3層の地図に整理する。B領域本編の締めくくり。' },
      { id: 'b-04', title: '安定度入門──運用容量を決める残り3つの限度', file: '04-stability-basics.html', exerciseCount: 4,
        summary: '運用容量を決める4つの限度のうち熱容量以外の3つ（同期安定性・電圧安定性・周波数維持）が「なぜ限度になるのか」を、P-δカーブ・P-Vカーブ・系統分断の直感で学ぶ。B-02で名前だけ登場した安定度の回収。' },
      { id: 'b-05', title: 'コネクト&マネージの残り2本──N-1電制と想定潮流の合理化', file: '05-n1-shedding-and-flow-rationalization.html', exerciseCount: 4,
        summary: '発展編。B-03で名前だけだった2本の柱を数値例で深掘りする。N-1電制（平常時上限＝残回線容量＋電制量）と想定潮流の合理化（空き増分＝想定の削減量）、そして3本柱が段階の関係であることを学ぶ。' },
      { id: 'b-06', title: '基幹の外の混雑──ローカル系統・配電とDER', file: '06-local-and-distribution-congestion.html', exerciseCount: 4,
        summary: '発展編。混雑は基幹だけの話ではない——逆潮流、R≫Xの配電線で電圧が主役になる理由（ΔV≒R×I）、ノンファームのローカル拡大、DERの課題と戦力の両面性・TSO/DSO協調を学ぶ。混雑が起きる場所の全景が完成。' },
      { id: 'b-07', title: '設備で潮流を振り替える──移相器・直列補償と直流連系', file: '07-flow-control-devices.html', exerciseCount: 4,
        summary: '発展編。運用（再給電）と増強の間にある第3の打ち手＝設備で潮流そのものを動かす。移相器（位相差で押し引き）・直列補償（電気的距離を縮める）・直流連系HVDC（指令値で流せる・非同期連系）を学び、B-03の対策地図に「機器」の軸を書き足す。東西の周波数変換所・北本連系の物理的背景も回収。' },
    ],
  },
  c: {
    name: '系統モデル',
    folder: 'c-grid-model',
    summary: '実際の系統を計算可能なモデル（母線・線路・アドミタンス）として表現する方法を学ぶ。',
    units: [
      { id: 'c-01', title: '母線・送電線・系統モデルの構造', file: '01-grid-model-structure.html', exerciseCount: 3,
        summary: '実系統を母線（節点）・送電線（枝）に抽象化し、送電線インピーダンスからアドミタンス行列（Yバス）を組み立てる考え方を学ぶ。D領域の入力になる。' },
      { id: 'c-02', title: '系統データと混雑計算のインプット', file: '02-system-data-and-inputs.html', exerciseCount: 3,
        summary: '系統構成計画・作業停止計画・需給計画が系統モデル（Yバス・注入）にどう反映されるかを学ぶ。N-1解析で1回線を落とした構成の作り方にも触れる。' },
      { id: 'c-03', title: '上位系統・下位系統と集約母線', file: '03-upper-lower-and-aggregated-bus.html', exerciseCount: 3,
        summary: '上位系統（基幹）と下位系統の階層構造、下位系統を1母線に集約する境界処理（注入＝発電合計−負荷合計、Yバス上の1母線）を学ぶ。計算量削減でSCUC/SCEDを現実的に解く。' },
      { id: 'c-04', title: 'DC潮流とAC潮流', file: '04-dc-and-ac-power-flow.html', exerciseCount: 3,
        summary: 'これまでの潮流計算がDC潮流という近似だったことを種明かしし、4つの仮定と線形性（重ね合わせ＝PTDFの土台）、電圧まで解くAC潮流との違い・使い分けを学ぶ。A-04で預けたDC/AC潮流の回収。' },
      { id: 'c-05', title: '公開系統データを読む', file: '05-reading-public-grid-data.html', exerciseCount: 4,
        summary: '学んだ概念の「実物」であるOCCTOの空容量公表・JEPXのエリアプライス・設備銘板を、公表様式に基づく例示値で読み・検算する実データ演習。A-05・B-02・E-07の実データでの回収。' },
      { id: 'c-06', title: '計測と状態推定', file: '06-measurement-and-state-estimation.html', exerciseCount: 3,
        summary: '誤差を含む計測値（テレメータ）から、物理法則と最もつじつまの合う「今」の系統状態を推定するしくみを、5つの時計のたとえで学ぶ。F-02「状態推定」の回収でC領域本編の締めくくり。' },
      { id: 'c-07', title: '開閉器と母線のモデル──トポロジー処理', file: '07-topology-processing.html', exerciseCount: 4,
        summary: '発展編。母線は開閉器の入切パターンから作られる——ノードブレーカモデルからバスブランチモデルを生成するトポロジー処理と、母線分割が潮流・混雑を変えること（薬にも毒にもなる）を学ぶ。' },
    ],
  },
  d: {
    name: '混雑計算のアルゴリズム',
    folder: 'd-algorithms',
    summary: '潮流計算、PTDF、N-1基準、再給電など、混雑を解消するための演算手法を学ぶ。',
    units: [
      { id: 'd-01', title: 'PTDFと感度分析', file: '01-ptdf-sensitivity.html', exerciseCount: 3,
        summary: '注入変化が送電線潮流に与える割合(PTDF)と、混雑解消に向けた感度分析を学ぶ。' },
      { id: 'd-02', title: '再給電（リディスパッチ）', file: '02-redispatch.html', exerciseCount: 4,
        summary: 'PTDFを使い、需給を保ちながら複数の発電機の出力調整で混雑を解消する手順を学ぶ。' },
      { id: 'd-03', title: 'SCUC/SCEDの概要', file: '03-scuc-sced-overview.html', exerciseCount: 3,
        summary: '再給電を最適化問題として定式化する。目的関数（発電コスト最小）と制約（需給・潮流・出力上下限）、SCUCとSCEDの違い、二段階構成を学ぶ。' },
      { id: 'd-04', title: '想定故障計算とLODF', file: '04-contingency-analysis-and-lodf.html', exerciseCount: 3,
        summary: '停止した線路の潮流が残りへ上乗せされる割合（LODF）で、N-1の混雑チェックを足し算で高速に回す方法を学ぶ。B-01の転流の式化であり、Security Constrainedの完成形。' },
      { id: 'd-05', title: '総合演習──ある日の混雑管理を通しで解く', file: '05-integrated-exercise.html', exerciseCount: 8,
        summary: '新しい知識ゼロの総仕上げ。1つの系統・1つのシナリオを、計画値→潮流→混雑判定→PTDF→再給電→N-1チェックまで、初見の数字で8問の数珠つなぎで通しで解く。D領域本編の締めくくり。' },
      { id: 'd-06', title: '最適化を「解く」──LP/MIPの直感とソルバー', file: '06-lp-mip-and-solvers.html', exerciseCount: 4,
        summary: '発展編。SCED=LPが速く解け、SCUC=MIPが重い理由を、2変数の例のグラフ解法（実行可能領域・頂点・有効制約）と分枝限定法の直感で学ぶ。D-03で預けた「解く」の中身の回収。' },
      { id: 'd-07', title: '混雑の値段──シャドープライスとLMP', file: '07-shadow-price-and-lmp.html', exerciseCount: 4,
        summary: '発展編。有効制約を1MW緩めたときのコスト改善＝シャドープライスを実際に計算し、母線ごとの電力の値段（LMP）と日本のゾーン制・米国のノーダル制の違いまでを学ぶ。D-06の「惜しさの値段」とF-06の約定価格の土台の回収。' },
      { id: 'd-08', title: 'コマをまたぐ制約──ランプ・揚水・蓄電池', file: '08-time-coupling-storage.html', exerciseCount: 4,
        summary: '発展編。ランプとSOCの遷移がコマをつなぐ時間結合制約となり、SCUCが複数コマ一括で解かれる理由を学ぶ。系統用蓄電池の「時間の価値・場所の価値」（PTDF・シャドープライス接続）まで。A-06のランプの回収。' },
    ],
  },
  e: {
    name: '電力市場',
    folder: 'e-market',
    summary: '市場で決まる計画値が系統演算の入力になる。市場と系統運用の接点を学ぶ。',
    units: [
      { id: 'e-01', title: 'BGと発電計画値', file: '01-bg-and-generation-plan.html', exerciseCount: 3,
        summary: '計画値同時同量制度の下でのBGの役割と、発電計画値・インバランスの基礎を学ぶ。' },
      { id: 'e-02', title: '計画値同時同量', file: '02-simultaneous-balancing.html', exerciseCount: 3,
        summary: 'BG・発電計画値・インバランスがなぜそうなっているのかを、周波数維持や小売自由化など制度面から理解する。' },
      { id: 'e-03', title: '需給調整市場', file: '03-balancing-market.html', exerciseCount: 3,
        summary: '調整力を市場で調達・運用する仕組みと、再給電（混雑）との違い・関係を学ぶ。' },
      { id: 'e-04', title: '優先給電ルールと出力制御の優先順位', file: '04-priority-dispatch.html', exerciseCount: 3,
        summary: '供給過剰・系統制約時にどの電源から抑制するかの公開ルール（優先給電ルール）を、再給電の実運用基準として学ぶ。' },
      { id: 'e-05', title: 'ノンファーム型接続（コネクト&マネージ）', file: '05-non-firm-connection.html', exerciseCount: 3,
        summary: '送電線の空き容量問題と、混雑時に抑制される条件付き接続（ノンファーム型接続）を、優先給電ルールの中で位置づける。' },
      { id: 'e-06', title: '再エネ出力制御のしくみ（需給と混雑、2つの抑制）', file: '06-renewable-curtailment.html', exerciseCount: 3,
        summary: '再エネが抑制される2つの理由（供給過剰＝需給／系統混雑＝送電制約）を区別し、優先給電ルール・ノンファーム・再給電を「再エネ抑制と混雑処理」の視点で整理する。' },
      { id: 'e-07', title: '卸電力市場と間接オークション', file: '07-wholesale-market-and-indirect-auction.html', exerciseCount: 3,
        summary: 'JEPXスポット市場のきほんと、連系線の空容量を市場の約定処理で配分する間接オークション、混雑が値差として現れる市場分断を学ぶ。B-02で預けた「連系線混雑の市場処理」の回収。' },
      { id: 'e-08', title: '間接送電権──エリア間値差のリスクをヘッジする', file: '08-indirect-transmission-rights.html', exerciseCount: 3,
        summary: '市場分断で生じるエリア間値差のリスクを、値差を受け取る権利＝間接送電権で固定するヘッジの仕組みを学ぶ。発行量は空容量が上限（B-02の式の親戚）。E-07で預けた「値差のヘッジ」の回収でE領域一巡。' },
      { id: 'e-09', title: '総合演習──ある日の連系線と市場を通しで解く', file: '09-integrated-exercise.html', exerciseCount: 8,
        summary: '新しい知識ゼロの制度・市場側の総仕上げ。公表イメージの読み取り→空容量→市場分断・値差→間接送電権の精算→地内混雑の運用対応まで、初見の数字で8問の数珠つなぎで通しで解く。D-05（計算側の総合演習）の対。E領域本編の締めくくり。' },
      { id: 'e-10', title: 'インバランス料金──計画とのズレの値段', file: '10-imbalance-pricing.html', exerciseCount: 4,
        summary: '発展編。インバランス料金の単価が調整力の実費（限界的kWh価格）に連動する理屈と、需給ひっ迫時補正（広域予備率が低いほど単価上昇）を学ぶ。E-01で預けた「インバランス料金」の回収。' },
      { id: 'e-11', title: '時間前市場──スポットの後、ゲートクローズの前', file: '11-intraday-market.html', exerciseCount: 4,
        summary: '発展編。スポット約定とゲートクローズの間に開くザラバ方式の市場で、予測外れ・電源トラブル時に計画を直せることを学ぶ。E-10のインバランス料金との天秤でBGのリスク管理が完成。F-04で名前だけだった時間前市場の回収。' },
      { id: 'e-12', title: '混雑処理の費用は誰が負担するか', file: '12-congestion-cost-allocation.html', exerciseCount: 4,
        summary: '発展編。再給電費用＝単価差×量（メリットオーダーの崩れ）、ノンファーム抑制は無補償、運用費用は託送料金で一般負担、という混雑の「お金の流れ」を整理する。累積費用が増強判断の材料になる（B-03の循環の回収）。' },
      { id: 'e-13', title: 'kWの市場──容量市場と長期脱炭素電源オークション', file: '13-capacity-market.html', exerciseCount: 4,
        summary: '発展編。kWh・ΔkWに続く第3の価値＝kW（発電できる能力）。再エネ拡大で固定費が回収しにくくなる問題と、4年前のメインオークション・原則20年の長期脱炭素電源オークションを学ぶ。混雑（場所）との距離感も明示。' },
      { id: 'e-14', title: 'FIT/FIPと再エネの市場統合', file: '14-fit-fip.html', exerciseCount: 4,
        summary: '発展編。FIT（固定価格・市場を見ない）からFIP（市場価格＋プレミアム・収入が市場連動）へ。高い時間に売る動機・インバランス責任・アグリゲーターの台頭など、再エネが市場と系統の一員になる道筋を学ぶ。E領域完結。' },
    ],
  },
  f: {
    name: '中央給電指令所システム',
    folder: 'f-dispatch-system',
    summary: 'A〜Eの知識を統合し、実際の給電指令システムがどう動くかを俯瞰する。',
    units: [
      { id: 'f-01', title: '系統混雑管理の全体像', file: '01-congestion-management-overview.html', exerciseCount: 3,
        summary: '発電計画値→潮流計算→混雑判定→再給電という一連の流れを、運用の時間軸の中で俯瞰する。' },
      { id: 'f-02', title: '次期中給システムの機能構成', file: '02-next-gen-dispatch-system.html', exerciseCount: 3,
        summary: 'SCUC/SCED・混雑計算・状態推定など、次期中給システムの機能構成と、混雑計算が最適化の前処理として動く構造を公開資料に基づき概観する。' },
      { id: 'f-03', title: '現行と次期中給の比較（再エネ抑制と混雑処理）', file: '03-current-vs-next-dispatch.html', exerciseCount: 3,
        summary: '再エネ抑制・混雑処理を、現行（エリア中心のルールベース）と次期中給（全国一括のSCUC/SCED最適化）で比較し、段階的な移行（二段階構成）を学ぶ。' },
      { id: 'f-04', title: '中給システムの演算タイミングと時間断面', file: '04-computation-timing.html', exerciseCount: 3,
        summary: '30分コマ・ゲートクローズの時間軸の上に、予測・混雑計算・SCUC（早め）・SCED（直前）がいつ・どのコマを対象に走るかを整理する。' },
      { id: 'f-05', title: '需給制御（GF・LFC・EDC）と混雑管理', file: '05-frequency-control-and-congestion.html', exerciseCount: 3,
        summary: '実需給の中で周波数を守る需給制御の3層（GF＝秒・自律／LFC＝分・自動指令／EDC＝数分〜・経済配分）と、混雑管理（潮流・場所）との違い・接点を学ぶ。F-02「広域LFC」の回収でF領域完結。' },
      { id: 'f-06', title: '同時市場──kWhとΔkWを一緒に約定する', file: '06-simultaneous-market.html', exerciseCount: 3,
        summary: 'スポット市場（kWh）と需給調整市場（ΔkW）を、三部制入札とSCUC/SCEDによる1つの約定にまとめる「同時市場」の検討を、公開資料の範囲で学ぶ。E-07で予告した「市場と運用の一体最適化」の回収。' },
      { id: 'f-07', title: '需要予測・再エネ予測──計算チェーンの最上流', file: '07-demand-and-renewable-forecast.html', exerciseCount: 4,
        summary: '需要予測・再エネ予測がどう作られ（気温・曜日／気象予報）、なぜ外れ、外れにどう備えるか（予備力・調整力・直前のSCED）を学ぶ。F-02・F-04で名前だけ登場した「予測」の回収。' },
      { id: 'f-08', title: '中給を支えるシステム群──SCADA・EMSとデータの流れ', file: '08-scada-ems-data-flow.html', exerciseCount: 4,
        summary: 'SCADA（目と手）とEMS（頭脳）の2階建てで、テレメータ→SCADA→状態推定→各アプリ→指令というデータの流れ、周期の階層（秒〜分〜30分コマ）、二重化・バックアップを学ぶ。C-06とF-02の間を埋める。' },
      { id: 'f-09', title: '計画のバケツリレー──広域機関システムと系統間連携', file: '09-occto-system-and-plan-flow.html', exerciseCount: 4,
        summary: '発展編。BGの計画がJEPXの約定を織り込み、広域機関システム（受付・整合チェック・配信）を経て各エリアの中給の演算入力に届く経路と、連系線利用計画を一枚の地図にする。F-08（物理データ）と対になる「計画データ」の流れ。' },
      { id: 'f-10', title: '需給ひっ迫と緊急時の運用', file: '10-supply-demand-emergency.html', exerciseCount: 4,
        summary: '発展編。広域予備率5%/3%の注意報・警報、打ち手の階段（追加起動・揚水→広域融通→DR・節電要請→計画停電）、2021年1月・2022年3月の実例。B-02マージンの「万一」の回収と、量と場所が緊急時に絡み合う構図。' },
      { id: 'f-11', title: '総合演習──ある日の中給を通しで解く', file: '11-integrated-exercise.html', exerciseCount: 8,
        summary: '新しい知識ゼロの第3の総合演習（時間の背骨）。前日の予測・予備率→SCUC起動リミット→当日の下振れ→時間前市場→直前SCED→実需給の慣性・GF→翌日のインバランス精算まで、中給の一日を初見の数字で8問の数珠つなぎで通しで解く。D-05（計算）・E-09（お金）と三部作。' },
    ],
  },
};

/* 領域間の依存関係（第5章 5.4）。値は前提となる領域キーの配列。 */
const DOMAIN_PREREQUISITES = {
  a: [],
  b: ['a'],
  c: ['a'],
  d: ['b', 'c', 'e'],
  e: [],
  f: ['a', 'b', 'c', 'd', 'e'],
};

const DOMAIN_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

/* 領域キー → CSS変数名（領域アクセント色） */
function domainColorVar(key) {
  return `var(--color-unit-${key})`;
}

/* ------------------------------------------------------------
   パス解決
   common.js はトップ(深さ0)・領域/ユニット(深さ2)・用語集(深さ1)から
   読み込まれる。各ページが持つ <link href=".../css/style.css"> を基準に
   サイトルートへの相対プレフィックスを求める（file:// でも動作する）。
   ------------------------------------------------------------ */
function rootPrefix() {
  const link = document.querySelector('link[rel="stylesheet"][href*="css/style.css"]');
  if (!link) return '';
  return link.getAttribute('href').replace(/css\/style\.css.*$/, '');
}

const ROOT = rootPrefix();

function urlTop() { return `${ROOT}index.html`; }
function urlDomain(key) { return `${ROOT}units/${SITE_STRUCTURE[key].folder}/index.html`; }
function urlUnit(key, file) { return `${ROOT}units/${SITE_STRUCTURE[key].folder}/${file}`; }
function urlGlossary() { return `${ROOT}glossary/index.html`; }
function urlReview() { return `${ROOT}review/index.html`; }

/* ============================================================
   進捗管理（第8章）  exercise-engine.js からも利用する
   ============================================================ */
const STORAGE_KEY = 'gcl-progress';
const PROGRESS_VERSION = 2;

/* localStorage が使えない環境（古い file:// 等）でも壊れないようにする */
function safeStorage() {
  try {
    const t = '__gcl_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

function getProgress() {
  const store = safeStorage();
  if (!store) return { version: PROGRESS_VERSION, exercises: {} };
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { version: PROGRESS_VERSION, exercises: {} };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.exercises) {
      return { version: PROGRESS_VERSION, exercises: {} };
    }
    return migrateProgress(data);
  } catch (e) {
    return { version: PROGRESS_VERSION, exercises: {} };
  }
}

/** v1（status/lastAttemptのみ）→ v2（履歴フィールド付き）への自動移行（第8章 8.2） */
function migrateProgress(data) {
  if (data.version >= PROGRESS_VERSION) return data;
  Object.keys(data.exercises).forEach((id) => {
    const rec = data.exercises[id];
    rec.attempts = 1;
    rec.firstTry = null; /* v1では初回結果が不明 */
    rec.streak = rec.status === 'correct' ? 1 : 0;
  });
  data.version = PROGRESS_VERSION;
  writeProgress(data);
  return data;
}

function writeProgress(data) {
  const store = safeStorage();
  if (!store) return;
  try { store.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* 容量超過等は無視 */ }
}

/** 演習の判定結果を保存する（第8章 8.3）。status: 'correct' | 'incorrect'
    attempts（通算回数）・firstTry（初回結果）・streak（連続正解）も更新する。 */
function setExerciseStatus(exerciseId, status) {
  const data = getProgress();
  const prev = data.exercises[exerciseId] || {};
  const attempts = (prev.attempts || 0) + 1;
  const firstTry = (prev.attempts || 0) > 0
    ? (prev.firstTry !== undefined ? prev.firstTry : null)
    : status;
  const streak = status === 'correct' ? (prev.streak || 0) + 1 : 0;
  data.exercises[exerciseId] = {
    status,
    lastAttempt: new Date().toISOString(),
    attempts,
    firstTry,
    streak,
  };
  writeProgress(data);
}

/** 演習を未着手に戻す（「やり直す」/ 第8章 8.3）。
    statusだけ削除し、attempts・firstTry・streakの履歴は保持する。 */
function clearExerciseStatus(exerciseId) {
  const data = getProgress();
  const rec = data.exercises[exerciseId];
  if (rec) {
    delete rec.status;
    writeProgress(data);
  }
}

/** 1演習の記録を取得する（未着手なら null） */
function getExerciseStatus(exerciseId) {
  return getProgress().exercises[exerciseId] || null;
}

/** すべての進捗を消去する（第8章 8.5）。復習キューも一緒に消す */
function resetAllProgress() {
  const store = safeStorage();
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
      store.removeItem(REVIEW_KEY);
    } catch (e) { /* noop */ }
  }
}

/* ------------------------------------------------------------
   進捗のエクスポート / インポート（第8章 8.8）
   localStorage はブラウザ・オリジン（file:// と GitHub Pages は別）ごとに
   独立しているため、JSONファイルで進捗を持ち運べるようにする。
   ------------------------------------------------------------ */
const EXPORT_SITE_MARKER = 'grid-congestion-lab';

function buildExportData() {
  return {
    site: EXPORT_SITE_MARKER,
    exportedAt: new Date().toISOString(),
    progress: getProgress(),
    review: readReviewState(),
  };
}

/** 進捗をJSONファイルとしてダウンロードする */
function downloadProgressFile() {
  const blob = new Blob([JSON.stringify(buildExportData(), null, 2)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gcl-progress-${localDateString(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** インポートテキストの検証。エクスポート形式（envelope）と gcl-progress 単体の
    両方を受け付ける。妥当なら { progress, review } を、不正なら null を返す */
function parseImportData(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || typeof data !== 'object') return null;
  const isEnvelope = data.site === EXPORT_SITE_MARKER;
  const progress = isEnvelope ? data.progress : data;
  if (!progress || typeof progress !== 'object'
      || !progress.exercises || typeof progress.exercises !== 'object') return null;
  return { progress, review: isEnvelope ? data.review : null };
}

/** 進捗をインポートする（既存の進捗は上書き。確認ダイアログあり）。
    v1形式のprogressは次回読み込み時の移行処理（8.2）がそのまま適用される。 */
function importProgressFromText(text) {
  const parsed = parseImportData(text);
  if (!parsed) {
    window.alert('読み込めませんでした。このサイトの「学習進捗をエクスポート」で保存したJSONファイルを選んでください。');
    return false;
  }
  const incoming = Object.keys(parsed.progress.exercises).length;
  const current = Object.keys(getProgress().exercises).length;
  const ok = window.confirm(
    `インポートすると、このブラウザの進捗（解答記録 ${current} 件）は、`
    + `読み込んだファイルの進捗（解答記録 ${incoming} 件）で置き換えられます。よろしいですか？`);
  if (!ok) return false;
  const store = safeStorage();
  if (!store) {
    window.alert('このブラウザでは進捗を保存できません（localStorageが利用できません）。');
    return false;
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(parsed.progress));
    if (parsed.review && typeof parsed.review === 'object' && Array.isArray(parsed.review.queue)) {
      store.setItem(REVIEW_KEY, JSON.stringify(parsed.review));
    } else {
      /* 古いキューを残さない（キューは進捗から日次で再生成される） */
      store.removeItem(REVIEW_KEY);
    }
  } catch (e) {
    window.alert('進捗の保存に失敗しました。');
    return false;
  }
  return true;
}

/** トップページのエクスポート/インポートボタンを配線する（第8章 8.8） */
function setupProgressTransfer() {
  const box = document.querySelector('.progress-transfer');
  if (!box) return;
  const exportBtn = box.querySelector('.btn-export');
  const importBtn = box.querySelector('.btn-import');
  if (exportBtn) exportBtn.addEventListener('click', downloadProgressFile);
  if (!importBtn) return;
  const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  box.appendChild(file);
  importBtn.addEventListener('click', () => { file.value = ''; file.click(); });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (importProgressFromText(String(reader.result))) {
        window.alert('進捗をインポートしました。');
        window.location.reload();
      }
    };
    reader.onerror = () => window.alert('ファイルを読み込めませんでした。');
    reader.readAsText(f);
  });
}

/** 領域内の完了状況を集計する → { total, correct } */
function domainProgress(key) {
  const domain = SITE_STRUCTURE[key];
  const data = getProgress();
  let total = 0;
  let correct = 0;
  domain.units.forEach((unit) => {
    total += unit.exerciseCount || 0;
    for (let i = 1; i <= (unit.exerciseCount || 0); i += 1) {
      const id = `${unit.id}-ex${String(i).padStart(2, '0')}`;
      const rec = data.exercises[id];
      if (rec && rec.status === 'correct') correct += 1;
    }
  });
  return { total, correct };
}

/** ユニットの状態を返す（第8章 8.4b） → 'done' | 'progress' | 'none' */
function unitState(unit) {
  const data = getProgress();
  const count = unit.exerciseCount || 0;
  if (count === 0) return 'none';
  let correct = 0;
  for (let i = 1; i <= count; i += 1) {
    const id = `${unit.id}-ex${String(i).padStart(2, '0')}`;
    const rec = data.exercises[id];
    if (rec && rec.status === 'correct') correct += 1;
  }
  if (correct === count) return 'done';
  if (correct > 0) return 'progress';
  return 'none';
}

/* ============================================================
   復習キュー（第8章 8.7）
   review/index.html の描画と、exercise-engine.js の done 記録が使う。
   ============================================================ */
const REVIEW_KEY = 'gcl-review';
const REVIEW_MAX = 10;

/** streakに応じた復習期限（日）: 7 → 14 → 28 → 56（上限） */
function reviewIntervalDays(streak) {
  if (streak <= 1) return 7;
  if (streak === 2) return 14;
  if (streak === 3) return 28;
  return 56;
}

/** 端末ローカル日付の 'YYYY-MM-DD'（キューの日替わり判定に使う） */
function localDateString(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** SITE_STRUCTURE から全演習IDを列挙する */
function allExerciseIds() {
  const ids = [];
  DOMAIN_KEYS.forEach((key) => {
    SITE_STRUCTURE[key].units.forEach((unit) => {
      for (let i = 1; i <= (unit.exerciseCount || 0); i += 1) {
        ids.push(`${unit.id}-ex${String(i).padStart(2, '0')}`);
      }
    });
  });
  return ids;
}

/** 演習ID → { domainKey, unit, exNumber, url }。未知のIDは null */
function exerciseInfo(exerciseId) {
  const m = /^([a-f])-(\d+)-ex(\d+)$/.exec(exerciseId);
  if (!m) return null;
  const domainKey = m[1];
  const domain = SITE_STRUCTURE[domainKey];
  if (!domain) return null;
  const unitId = `${m[1]}-${m[2]}`;
  const unit = domain.units.find((u) => u.id === unitId);
  if (!unit) return null;
  return { domainKey, unit, exNumber: parseInt(m[3], 10), url: urlUnit(domainKey, unit.file) };
}

/** 出題対象（due）の演習を集める（第8章 8.7）。
    不正解＝常に対象、正解＝streakに応じた復習期限を過ぎたら対象。 */
function collectDueExercises(now) {
  const data = getProgress();
  const incorrect = [];
  const stale = [];
  allExerciseIds().forEach((id) => {
    const rec = data.exercises[id];
    if (!rec || !rec.status) return; /* 未着手・やり直し中は対象外 */
    if (rec.status === 'incorrect') {
      incorrect.push({ id, last: Date.parse(rec.lastAttempt) || 0 });
      return;
    }
    const days = (now - (Date.parse(rec.lastAttempt) || 0)) / 86400000;
    const limit = reviewIntervalDays(rec.streak || 1);
    if (days >= limit) stale.push({ id, overdue: days - limit });
  });
  incorrect.sort((a, b) => a.last - b.last);   /* 放置が長い順 */
  stale.sort((a, b) => b.overdue - a.overdue); /* 期限超過が大きい順 */
  return { incorrect, stale };
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/** 今日の復習キューを作る（不正解優先→期限超過、最大 REVIEW_MAX 問、領域を混ぜてシャッフル） */
function buildReviewQueue() {
  const due = collectDueExercises(Date.now());
  const picked = due.incorrect.concat(due.stale).slice(0, REVIEW_MAX).map((e) => e.id);
  return shuffleArray(picked);
}

function readReviewState() {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(REVIEW_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object' || !Array.isArray(state.queue)) return null;
    if (!Array.isArray(state.done)) state.done = [];
    return state;
  } catch (e) {
    return null;
  }
}

function writeReviewState(state) {
  const store = safeStorage();
  if (!store) return;
  try { store.setItem(REVIEW_KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
}

/** 今日のキューを取得する（日付が変わっていれば再生成）。復習ページが呼ぶ */
function getTodayReview() {
  const today = localDateString(new Date());
  let state = readReviewState();
  if (!state || state.date !== today) {
    state = { date: today, queue: buildReviewQueue(), done: [] };
    writeReviewState(state);
  }
  return state;
}

/** 判定済みの演習を当日キューの done へ記録する（キュー未生成の日は何もしない）。
    復習モード経由かどうかは問わない（第7章 7.7）。 */
function markReviewDone(exerciseId) {
  const state = readReviewState();
  if (!state || state.date !== localDateString(new Date())) return;
  if (state.queue.indexOf(exerciseId) === -1) return;
  if (state.done.indexOf(exerciseId) === -1) {
    state.done.push(exerciseId);
    writeReviewState(state);
  }
}

/* ============================================================
   グローバルナビゲーション（第5章 5.3a）
   ============================================================ */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style') node.setAttribute('style', v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function buildHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const currentDomain = document.body.dataset.domain || null;
  const isGlossary = document.body.dataset.page === 'glossary';

  const title = el('a', { class: 'site-title', href: urlTop() }, '系統混雑ラボ');

  const toggle = el('button', {
    class: 'nav-toggle',
    type: 'button',
    'aria-label': 'メニューを開閉',
    'aria-expanded': 'false',
    'aria-controls': 'global-nav-menu',
  }, [el('span'), el('span'), el('span')]);

  const menu = el('ul', { class: 'nav-menu', id: 'global-nav-menu' });

  DOMAIN_KEYS.forEach((key) => {
    const d = SITE_STRUCTURE[key];
    const link = el('a', {
      href: urlDomain(key),
      dataset: { domain: key },
      style: `--dot-color:${domainColorVar(key)}`,
    }, `${key.toUpperCase()}: ${d.name}`);
    if (currentDomain === key) link.setAttribute('aria-current', 'page');
    menu.appendChild(el('li', {}, link));
  });
  const glossaryLink = el('a', { href: urlGlossary() }, '用語集');
  if (isGlossary) glossaryLink.setAttribute('aria-current', 'page');
  menu.appendChild(el('li', {}, glossaryLink));
  const reviewLink = el('a', { href: urlReview() }, '復習');
  if (document.body.dataset.page === 'review') reviewLink.setAttribute('aria-current', 'page');
  menu.appendChild(el('li', {}, reviewLink));

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  // メニュー内リンクをクリックしたら閉じる（モバイル）
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  const nav = el('nav', { class: 'site-nav', 'aria-label': 'グローバルナビゲーション' }, [title, toggle, menu]);
  header.replaceChildren(nav);
}

/* ============================================================
   トップページのレンダリング（第6章 6.1）
   ============================================================ */
function renderTopPage() {
  const container = document.querySelector('.domain-cards');
  if (container) {
    container.replaceChildren(...DOMAIN_KEYS.map(renderDomainCard));
  }
  setupResetButton();
  setupProgressTransfer(); // .progress-transfer があるページ（トップ）のみ動作
}

function renderDomainCard(key) {
  const d = SITE_STRUCTURE[key];
  const { total, correct } = domainProgress(key);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const fill = el('div', { class: 'progress-fill', style: `width:${pct}%` });
  const label = el('span', { class: 'progress-label' },
    total > 0 ? `${correct}/${total} 完了` : 'ユニット準備中');
  const progress = el('div', { class: 'progress', role: 'progressbar',
    'aria-valuenow': String(correct), 'aria-valuemin': '0', 'aria-valuemax': String(total) },
    [el('div', { class: 'progress-track' }, fill), label]);

  const head = el('div', { class: 'domain-card-head' }, [
    el('span', { class: 'domain-card-badge' }, key.toUpperCase()),
    el('span', { class: 'domain-card-title' }, d.name),
  ]);

  return el('a', {
    class: 'domain-card',
    href: urlDomain(key),
    style: `--card-color:${domainColorVar(key)}`,
  }, [
    head,
    el('p', { class: 'domain-card-summary' }, d.summary),
    el('p', { class: 'domain-card-summary' }, `ユニット数: ${d.units.length}`),
    progress,
  ]);
}

function setupResetButton() {
  const btn = document.querySelector('.btn-reset');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const ok = window.confirm('すべての学習進捗がリセットされます。この操作は取り消せません。よろしいですか？');
    if (!ok) return;
    resetAllProgress();
    window.location.reload();
  });
}

/* ============================================================
   領域トップページのレンダリング（第6章 6.2）
   body[data-domain] と .unit-list を持つページで動作する。
   ============================================================ */
function renderDomainTopPage() {
  const key = document.body.dataset.domain;
  if (!key || !SITE_STRUCTURE[key]) return;
  const listSection = document.querySelector('.unit-list');
  if (!listSection) return;

  const d = SITE_STRUCTURE[key];
  const ol = el('ol');

  if (d.units.length === 0) {
    listSection.appendChild(el('p', { class: 'unit-list-empty' },
      'この領域のユニットは準備中です。'));
    return;
  }

  d.units.forEach((unit, idx) => {
    const state = unitState(unit);
    const icon = state === 'done' ? '✅' : state === 'progress' ? '🔶' : '';
    const num = unit.id.toUpperCase();
    const titleLink = el('a', { href: urlUnit(key, unit.file) }, unit.title);
    ol.appendChild(el('li', { class: 'unit-item' }, [
      el('span', { class: 'unit-item-number' }, num),
      el('div', { class: 'unit-item-body' }, [
        el('div', { class: 'unit-item-title' }, titleLink),
        unit.summary ? el('p', { class: 'unit-item-summary' }, unit.summary) : null,
      ]),
      el('span', { class: 'unit-item-status', 'aria-label': state === 'done' ? '完了' : state === 'progress' ? '進行中' : '未着手' }, icon),
    ]));
  });
  listSection.appendChild(ol);
}

/* ============================================================
   数式（KaTeX）のレンダリング（第2章 2.4 / フォールバック対応）
   .math-block に data-tex（TeXソース）と data-fallback（平文）を持たせる。
   KaTeXが読み込めない場合は data-fallback を表示する。
   ============================================================ */
function renderMathBlock(node) {
  const tex = node.dataset.tex != null ? node.dataset.tex : node.textContent.trim();
  const display = !node.classList.contains('math-inline');
  try {
    window.katex.render(tex, node, { displayMode: display, throwOnError: false });
    node.classList.remove('is-fallback');
  } catch (e) {
    showMathFallback(node);
  }
}

function showMathFallback(node) {
  node.textContent = node.dataset.fallback || node.dataset.tex || '';
  node.classList.add('is-fallback');
}

function renderMath() {
  const blocks = document.querySelectorAll('.math-block, .math-inline');
  if (!blocks.length) return;
  if (window.katex) {
    blocks.forEach(renderMathBlock);
    return;
  }
  // この時点でKaTeX未読込: いったんフォールバックを描画し、
  // defer の KaTeX が読み終わる window 'load' で再描画を試みる。
  blocks.forEach(showMathFallback);
  window.addEventListener('load', () => {
    if (window.katex) blocks.forEach(renderMathBlock);
  }, { once: true });
}

/* ============================================================
   ユニットページ: 前回結果の表示（第8章 8.4c）
   ============================================================ */
function renderPrevResults() {
  document.querySelectorAll('.exercise[data-exercise-id]').forEach((ex) => {
    const id = ex.dataset.exerciseId;
    const rec = getExerciseStatus(id);
    if (!rec || !rec.status) return; /* 未着手・やり直し中（statusなし）は表示しない */
    const date = (rec.lastAttempt || '').slice(0, 10);
    const verdict = rec.status === 'correct' ? '正解' : '不正解';
    const note = el('p', {
      class: `exercise-prev-result is-${rec.status}`,
    }, `前回: ${verdict}（${date}）`);
    const problem = ex.querySelector('.exercise-problem') || ex.querySelector('h3');
    if (problem) problem.insertAdjacentElement('beforebegin', note);
  });
}

/* ============================================================
   復習ページのレンダリング（第6章 6.6 / 第8章 8.7）
   .review-queue と .weakness-summary を持つページで動作する。
   ============================================================ */
function renderReviewPage() {
  const queueBox = document.querySelector('.review-queue');
  if (!queueBox) return;

  const data = getProgress();

  /* 解答履歴が1件もない場合の案内 */
  if (Object.keys(data.exercises).length === 0) {
    queueBox.appendChild(el('p', { class: 'review-empty' },
      'まだ解答の記録がありません。ユニットの演習を解くと、時間をあけてここに復習問題が並びます。'));
    renderWeaknessSummary(data);
    return;
  }

  const state = getTodayReview();

  if (state.queue.length === 0) {
    queueBox.appendChild(el('p', { class: 'review-empty' },
      '今日の復習はありません。不正解のままの問題や、正解から時間が経った問題が出てくると、ここに並びます。'));
    renderWeaknessSummary(data);
    return;
  }

  const remaining = state.queue.filter((id) => state.done.indexOf(id) === -1).length;
  queueBox.appendChild(el('p', { class: 'review-status' },
    remaining === 0
      ? `今日の ${state.queue.length} 問はすべて解き直しました。おつかれさまでした。`
      : `今日の復習: ${state.queue.length} 問（残り ${remaining} 問）`));

  const ol = el('ol', { class: 'review-list' });
  state.queue.forEach((id) => {
    const info = exerciseInfo(id);
    if (!info) return; /* 構成から消えた古いIDは表示しない */
    const done = state.done.indexOf(id) !== -1;
    const label = `${info.unit.id.toUpperCase()}「${info.unit.title}」 演習${info.exNumber}`;
    const badge = el('span', {
      class: 'review-badge',
      style: `--badge-color:${domainColorVar(info.domainKey)}`,
    }, info.domainKey.toUpperCase());
    const body = done
      ? el('span', { class: 'review-item-label' }, label)
      : el('a', { class: 'review-item-label', href: `${info.url}?review=1&ex=${id}` }, label);
    const mark = el('span', { class: 'review-item-status' }, done ? '✅' : '');
    ol.appendChild(el('li', { class: `review-item${done ? ' is-done' : ''}` }, [badge, body, mark]));
  });
  queueBox.appendChild(ol);
  queueBox.appendChild(el('p', { class: 'review-note' },
    '不正解のままの問題と、正解から時間が経った問題（正解を重ねるほど間隔が延びます）から、1日最大10問を選んでいます。'));

  renderWeaknessSummary(data);
}

/** 領域ごとの「不正解のまま」「初回つまずき（今は正解）」を集計して表示する */
function renderWeaknessSummary(data) {
  const box = document.querySelector('.weakness-summary');
  if (!box) return;
  const rows = [];
  DOMAIN_KEYS.forEach((key) => {
    let incorrect = 0;
    let stumbled = 0;
    SITE_STRUCTURE[key].units.forEach((unit) => {
      for (let i = 1; i <= (unit.exerciseCount || 0); i += 1) {
        const rec = data.exercises[`${unit.id}-ex${String(i).padStart(2, '0')}`];
        if (!rec) continue;
        if (rec.status === 'incorrect') incorrect += 1;
        else if (rec.status === 'correct' && rec.firstTry === 'incorrect') stumbled += 1;
      }
    });
    if (incorrect > 0 || stumbled > 0) rows.push({ key, incorrect, stumbled });
  });
  if (rows.length === 0) {
    box.appendChild(el('p', { class: 'review-empty' }, '目立った弱点は記録されていません。'));
    return;
  }
  const ul = el('ul', { class: 'weakness-list' });
  rows.forEach((row) => {
    const badge = el('span', {
      class: 'review-badge',
      style: `--badge-color:${domainColorVar(row.key)}`,
    }, row.key.toUpperCase());
    const parts = [];
    if (row.incorrect > 0) parts.push(`不正解のまま ${row.incorrect} 問`);
    if (row.stumbled > 0) parts.push(`初回つまずき ${row.stumbled} 問（今は正解）`);
    ul.appendChild(el('li', {}, [badge,
      el('span', {}, [
        el('a', { href: urlDomain(row.key) }, SITE_STRUCTURE[row.key].name),
        `: ${parts.join(' ／ ')}`,
      ])]));
  });
  box.appendChild(ul);
}

/* ============================================================
   用語集の検索・領域フィルタ（第6章 6.4）
   Phase 1 では用語ゼロだが、追加後にそのまま動作する。
   ============================================================ */
function setupGlossary() {
  const search = document.getElementById('glossary-search');
  const filterGroup = document.querySelector('.glossary-domain-filter');
  const list = document.querySelector('.glossary-list');
  if (!search || !list) return;

  const emptyMsg = document.querySelector('.glossary-empty');
  let activeDomain = 'all';

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    list.querySelectorAll('.glossary-entry').forEach((entry) => {
      const domains = (entry.dataset.domain || '').split(',').map((s) => s.trim());
      const matchDomain = activeDomain === 'all' || domains.includes(activeDomain);
      const matchText = q === '' || entry.textContent.toLowerCase().includes(q);
      const show = matchDomain && matchText;
      entry.hidden = !show;
      if (show) visible += 1;
    });
    // 用語が存在し、かつ絞り込みで0件になったときだけ「該当なし」を表示する。
    // Phase 1 のように用語ゼロの場合は何も出さない。
    const total = list.querySelectorAll('.glossary-entry').length;
    if (emptyMsg) emptyMsg.hidden = !(total > 0 && visible === 0);
  };

  search.addEventListener('input', apply);
  if (filterGroup) {
    filterGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      activeDomain = btn.dataset.filter;
      filterGroup.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      apply();
    });
  }
  apply();
}

/* ============================================================
   フッターのアクセス解析注記（第2章 2.4）
   Google Analytics（Cookie 使用）の利用を全ページのフッターに明記する。
   footer は各HTMLに静的に置かれるため、注記はここで一元的に挿入し、
   追加漏れ（ページごとのドリフト）を防ぐ（ヘッダー生成と同じ方針）。
   ============================================================ */
function renderFooterNote() {
  const footer = document.querySelector('.site-footer');
  if (!footer || footer.querySelector('.footer-privacy')) return;
  const link = el('a', {
    href: 'https://policies.google.com/privacy',
    target: '_blank',
    rel: 'noopener noreferrer',
  }, 'Google のプライバシーポリシー');
  const note = el('p', { class: 'footer-privacy' }, [
    'このサイトは、公開版でのアクセス状況の把握に Google アナリティクス（Cookie を使用）を利用します。',
    'ローカル（file://）での閲覧時は計測しません。詳しくは ', link, ' をご覧ください。',
  ]);
  footer.appendChild(note);
}

/* ============================================================
   初期化
   ============================================================ */
function init() {
  buildHeader();
  renderFooterNote();      // 全ページのフッターにアクセス解析の注記を挿入
  renderTopPage();         // .domain-cards があるときのみ動作
  renderDomainTopPage();   // .unit-list があるときのみ動作
  renderMath();            // .math-block があるときのみ動作
  renderPrevResults();     // .exercise があるときのみ動作
  renderReviewPage();      // .review-queue があるときのみ動作
  setupGlossary();         // .glossary-list があるときのみ動作
}

  // 共通機能を名前空間で公開（exercise-engine.js などから参照する）
  window.GCL = {
    SITE_STRUCTURE,
    DOMAIN_PREREQUISITES,
    getProgress,
    setExerciseStatus,
    clearExerciseStatus,
    getExerciseStatus,
    resetAllProgress,
    domainProgress,
    unitState,
    markReviewDone,
    urlReview,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
