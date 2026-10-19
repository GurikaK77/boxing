/* Shadow Boxing: content and data. Everything that is taught or called out lives here:
   moves, combos, pools, focus texts, warm-up, cards, lessons. Plain script, shares globals with app.js. */
'use strict';

const MOVES = {
  '1':  { chip: '1', en: 'Jab',            ka: 'ჯები',             say: 'one' },
  '2':  { chip: '2', en: 'Cross',          ka: 'კროსი',            say: 'two' },
  '3':  { chip: '3', en: 'Lead hook',      ka: 'წინა ჰუკი',        say: 'three' },
  '4':  { chip: '4', en: 'Rear hook',      ka: 'უკანა ჰუკი',       say: 'four' },
  '5':  { chip: '5', en: 'Lead uppercut',  ka: 'წინა აპერკოტი',    say: 'five' },
  '6':  { chip: '6', en: 'Rear uppercut',  ka: 'უკანა აპერკოტი',   say: 'six' },
  '2b': { chip: '2', en: 'Body cross',     ka: 'კროსი ტანში',      say: 'two, body', body: true },
  '3b': { chip: '3', en: 'Body hook',      ka: 'ჰუკი ტანში',       say: 'three, body', body: true },
  'sl': { chip: 'SLIP', en: 'Slip',        ka: 'გაცდენა',          say: 'slip', def: true },
  'du': { chip: 'DUCK', en: 'Duck',        ka: 'დახრა',            say: 'duck', def: true },
  'bk': { chip: 'BACK', en: 'Step back',   ka: 'უკან გადადგომა',   say: 'back', def: true },
  'pv': { chip: 'TURN', en: 'Pivot',       ka: 'შემობრუნება',      say: 'pivot', def: true },
  '1b': { chip: '1', en: 'Body jab',        ka: 'ჯები ტანში',       say: 'one, body', body: true },
  'oh': { chip: 'OVER', en: 'Overhand',     ka: 'ოვერჰენდი',        say: 'overhand', word: true },
  'fe': { chip: 'FEINT', en: 'Feint',       ka: 'ფინტი',            say: 'feint', def: true },
  'pa': { chip: 'PARRY', en: 'Parry',       ka: 'მოგერიება',        say: 'parry', def: true },
  'bl': { chip: 'BLOCK', en: 'Block',       ka: 'ბლოკი',            say: 'block', def: true },
  'ro': { chip: 'ROLL', en: 'Roll',         ka: 'გადაგორება',       say: 'roll', def: true },
  'cl': { chip: 'LEFT', en: 'Circle left',  ka: 'წრე მარცხნივ',     say: 'circle left', foot: true },
  'cr': { chip: 'RIGHT', en: 'Circle right', ka: 'წრე მარჯვნივ',    say: 'circle right', foot: true },
  'ag': { chip: 'ANGLE', en: 'Cut the angle', ka: 'კუთხის გადაჭრა', say: 'angle', foot: true },
  'ij': { chip: 'JAB!', en: 'Jab coming',    ka: 'ჯები გიახლოვდება',  say: 'jab coming', threat: true },
  'ic': { chip: 'CROSS!', en: 'Cross coming', ka: 'კროსი გიახლოვდება', say: 'cross coming', threat: true },
  'ih': { chip: 'HOOK!', en: 'Hook coming',   ka: 'ჰუკი გიახლოვდება',  say: 'hook coming', threat: true }
};
// not a punch: defence, footwork and incoming-attack cues are not counted as punches
const isPunch = m => !m.def && !m.foot && !m.threat;
// distinct vibration pattern per move, so the combo can be felt without looking
const VIB = {
  '1': [12], '2': [12, 40, 12], '3': [30], '4': [30, 40, 30], '5': [10, 24, 10], '6': [10, 24, 10, 24, 10],
  '1b': [60], '2b': [60, 40, 60], '3b': [80], 'oh': [50, 30, 20],
  'sl': [70, 40, 70], 'du': [70, 40, 70], 'bk': [70, 40, 70], 'pv': [70, 40, 70], 'pa': [70, 40, 70], 'bl': [70, 40, 70], 'ro': [70, 40, 70],
  'fe': [8, 40, 8], 'cl': [8, 70, 8], 'cr': [8, 70, 8, 70, 8], 'ag': [8, 70, 8],
  'ij': [160], 'ic': [160], 'ih': [160]
};

const EASY = ['1 2', '1 2', '1 1 2', '1 2 3', '1 2 3 2', '2 3 2', '1 2 5', '1 2 1 2', '3 2', '1 1 2 3'];
const MID  = ['1 2 3 4', '1 2 5 2', '1 6 3 2', '1 2 3b 2', '2 3 6 3', '1 2 sl 2', '1 2 3 sl', '1 2 3 2 5', '1 5 2 3', '2b 3 2', '1 2 3 2 3 2'];
const PRO  = ['1 2 sl 3 2', '1 2 3 2 sl 2 3', '1 2 5 6 3 2', '1 1 2 sl 2 3 2', '2 sl 3 4 3', '1 3b 3 2', 'sl 2 3 2', 'bk 1 2 3', 'pv 3 2', '1 2 du 3 4 3', '1 2 3 4 5 6', '1 2 3b 3 2 pv', '1 du 2 3 2', 'sl 3 2 sl 3 2'];
// new moves: footwork (circle / angle), feint, parry, block, roll, body jab, overhand
const MID2 = ['1b 2 3', '1 2 pa 2', 'fe 1 2', '1 cl 2 3', '1 2 cr', 'bl 2 3', 'ag 1 2 3'];
const PRO2 = ['1 cl 1 2', '1 2 cr 3 2', '2 3 ag 1 2', 'bk 1 2 cl 3', 'fe 1 2 3', 'fe 2 3 2', 'ro 3 2 3', 'bl 2 3 2', 'pa 2 3 2', '1b 1 2 3', 'oh 3 2', '1 oh 3', 'cl 1 2 3 2', 'cr 2 3 ag 2'];
const POOLS = { easy: EASY, mid: EASY.concat(MID, MID2), pro: MID.concat(MID2, PRO, PRO2) };
// defence + counter: an incoming attack is called, you defend, then counter
const CEASY = ['ij sl 2', 'ij bk 2', 'ic sl 3', 'ij pa 2', 'ih bl 2', 'ic bk 1 2'];
const CMID  = ['ij sl 2 3', 'ij pa 2 3 2', 'ic sl 3 2', 'ic bk 1 2', 'ih du 2 3', 'ih bl 3 2', 'ij ro 2 3', 'ic ro 3 2'];
const CPRO  = ['ij sl 2 3 2', 'ic sl 3 2 sl', 'ih du 2 3 2 sl', 'ij pa 2 3b 2', 'ij sl 1 2 3 2', 'ic ro 3 6 3', 'ih bl 3 2 pv', 'ij bk 1 2 3', 'ic pv 3 2'];
const CPOOLS = { easy: CEASY, mid: CEASY.concat(CMID), pro: CMID.concat(CPRO) };
// last 10 seconds of a round: fast flurries, no defence
const FLURRY = ['1 2 1 2 1 2', '1 2 3 2 1 2', '2 3 2 3 2 3', '1 1 2 1 1 2', '1 2 3 4 3 2', '3 2 3 2'];
const LEVEL_NOTE = {
  easy: 'ძირითადი დარტყმები და მოკლე კომბინაციები.',
  mid: 'გრძელი სერიები, ტანში დარტყმები, გაცდენა და ფეხების მოძრაობა.',
  pro: 'დაცვა, ფინტები, წრეები და 6-დარტყმიანი სერიები.'
};
const MODE_NOTE = {
  combo: 'ტრენერი კომბინაციებს გეძახის.',
  counter: 'ტრენერი თავდასხმას გეძახის: დაიცავი თავი და უპასუხე.',
  free: 'ტრენერი კომბინაციებს აღარ გეძახის. ყოველ რაუნდს აქვს ფოკუსი, დანარჩენი შენზეა.'
};
// free round: one focus per round, plus short coach cues now and then
const FOCUS = [
  { en: 'Jab and move', ka: 'ჯები და მოძრაობა: ყოველი ჯების შემდეგ ფეხი გადაადგილე.' },
  { en: 'Head movement', ka: 'თავის მოძრაობა: ყოველი სერიის შემდეგ გაცდენა ან დახრა.' },
  { en: 'Work the body', ka: 'ტანში მუშაობა: დაიხარე და დარტყმა ტანში გაიტანე.' },
  { en: 'Use angles', ka: 'კუთხეები: დარტყმის შემდეგ გვერდზე გადადექი, წინ ნუ დგახარ.' },
  { en: 'Stay relaxed', ka: 'მოდუნებულად: ძალა მხოლოდ დარტყმის მომენტში.' },
  { en: 'Counter-punch', ka: 'წარმოიდგინე თავდასხმა, დაიცავი თავი და უპასუხე.' },
  { en: 'Fight a taller opponent', ka: 'წარმოიდგინე შენზე მაღალი მოწინააღმდეგე: შიგნით შეიჭერი.' }
];
const CUES = [
  { en: 'Hands up', ka: 'ხელები ზევით' },
  { en: 'Keep moving', ka: 'იმოძრავე' },
  { en: 'Chin down', ka: 'ნიკაპი დაბლა' },
  { en: 'Breathe', ka: 'ისუნთქე' },
  { en: 'Move your head', ka: 'თავი იმოძრავე' },
  { en: 'Stay on your toes', ka: 'ფეხის წვერებზე' }
];
// warm-up and cool-down: 30 seconds per exercise
const WARM = [
  { en: 'Light bounce', ka: 'მსუბუქი ხტუნვა', say: 'light bounce', hint: 'თოკის გარეშე, ფეხის წვერებზე. წარმოიდგინე, რომ თოკს ატრიალებ.' },
  { en: 'Arm circles', ka: 'მკლავების ბრუნვა', say: 'arm circles', hint: 'დიდი წრეები წინ და უკან. მხრები თანდათან გაცხელდება.' },
  { en: 'Neck and shoulders', ka: 'კისერი და მხრები', say: 'neck and shoulders', hint: 'კისერი ნელა, ორივე მიმართულებით. მხრები ზევით და უკან.' },
  { en: 'Hips and torso twist', ka: 'თეძო და ტანის ბრუნვა', say: 'hips and twist', hint: 'ფეხები ადგილზე, თეძო და მხრები ერთად ბრუნავს. ეს დარტყმის ძალაა.' },
  { en: 'Slow jab and cross', ka: 'ნელი ჯები და კროსი', say: 'slow jab and cross', hint: 'ნახევარი სიჩქარით, სრული ბრუნვით. ფორმას მიხედე.' }
];
const COOL = [
  { en: 'Walk and breathe', ka: 'ნელი სიარული და სუნთქვა', say: 'walk and breathe', hint: 'ხელები თავზე, ღრმა ჩასუნთქვა ცხვირით, ნელი ამოსუნთქვა პირით.' },
  { en: 'Shoulder stretch', ka: 'მხრების გაწელვა', say: 'shoulder stretch', hint: 'ხელი მკერდზე გადაიტანე და მეორე ხელით მსუბუქად მიიზიდე. მერე შეცვალე.' },
  { en: 'Chest and arms', ka: 'მკერდი და მკლავები', say: 'chest stretch', hint: 'ხელები ზურგს უკან გადააჭდე და გულმკერდი გახსენი.' },
  { en: 'Hips and legs', ka: 'თეძო და ფეხები', say: 'hips and legs', hint: 'ღრმა ნაბიჯი წინ, თითო მხარეს 15 წამი. ზურგი სწორი.' }
];
const PHASE_STEP = 30; // seconds per warm-up / cool-down exercise
const TEMPO = {
  slow: { step: 900, gap: 2400, rate: 0.85 },
  mid:  { step: 650, gap: 1700, rate: 1.0 },
  fast: { step: 460, gap: 1000, rate: 1.2 }
};
const TIPS = [
  'ხელები ყოველთვის ნიკაპთან ახლოს.',
  'ფეხები მოძრაობაში. ერთ ადგილას ნუ დგახარ.',
  'ამოისუნთქე თითოეულ დარტყმაზე.',
  'იდაყვები ტანთან, ნიკაპი ოდნავ დაბლა.',
  'მხრები მოდუნე, დარტყმა ბრუნვიდან მოდის.',
  'მუხლები ოდნავ მოხრილი.',
  'დარტყმის შემდეგ ხელი სწრაფად დააბრუნე.',
  'წარმოიდგინე ნამდვილი მოწინააღმდეგე.'
];
const READY_HINT = 'დადექი სტოიკაში: ფეხები მხრების სიგანეზე, მუხლები მოხრილი, ხელები სახესთან.';

const FORM = {};

/* ---------- Learning content (instructions are for the orthodox stance: left foot and hand forward) ---------- */
const CARDS = [
  { id: 'stance', group: 'basics', chip: 'STANCE', en: 'Stance', ka: 'დგომა', figs: ['stance', 'stanceFeet'], tokens: ['cl', 'cr'],
    steps: [
      'წინა (მარცხენა) ფეხი წინ, უკანა ფეხი ნახევარი ნაბიჯით უკან და ოდნავ გარეთ. ფეხებს შორის მხრების სიგანეა.',
      'მუხლები მოხრილია, წონა ორივე ფეხზეა. უკანა ქუსლი ოდნავ აწეულია, ისე რომ მზად იყო გადასაადგილებლად.',
      'ხელები სახესთან, იდაყვები ტანთან, ნიკაპი დაბლა, მხრები მოდუნებული. სხეული მოწინააღმდეგისკენ ოდნავ გვერდულადაა.'],
    mistake: 'ფეხები ერთ ხაზზეა ან ძალიან ახლოსაა: წონასწორობა ქრება. გაჩერებული, გაშეშებული დგომაც შეცდომაა, ვარჯიშისას სულ ოდნავ მოძრაობაში იყავი.',
    note: 'თუ მემარცხენე ხარ, მარცხენა და მარჯვენა უბრალოდ შეგიცვლია.' },
  { id: 'jab', group: 'punches', chip: '1', en: 'Jab', ka: 'ჯები', figs: ['jab'], tokens: ['1'],
    steps: [
      'წინა ხელი სწორად, სახის სიმაღლეზე გაისროლე. დარტყმის ბოლოს მუშტი ბრუნდება და ხელისგული ძირს იყურება.',
      'მხარი ნიკაპს უახლოვდება, რომ სახე დაიფაროს. უკანა ხელი სახესთან რჩება.',
      'ხელი ისევე სწრაფად დააბრუნე, როგორც გაისროლე, იმავე გზით.'],
    mistake: 'ხელს ჯერ უკან წევ ან ჩამოაგდებ (მოწინააღმდეგე ამას ხედავს). დარტყმა დაცვის პოზიციიდან პირდაპირ უნდა გავიდეს.' },
  { id: 'cross', group: 'punches', chip: '2', en: 'Cross', ka: 'კროსი', figs: ['cross'], tokens: ['2'],
    steps: [
      'უკანა ფეხის წვერზე ტრიალებ: ქუსლი ზევით, მუხლი შიგნით, თეძო წინ.',
      'თეძო, მხარი, მუშტი: ძალა ტანიდან მოდის და არა მხოლოდ ხელიდან.',
      'წინა ხელი სახეზე რჩება, ნიკაპი დაბლაა. დარტყმის შემდეგ ტანი და ხელი დაცვის პოზიციაში დააბრუნე.'],
    mistake: 'მხოლოდ ხელს ისვრი და ტანი ადგილზე რჩება. ან წინ ზედმეტად იხრები და წონასწორობას კარგავ.' },
  { id: 'lhook', group: 'punches', chip: '3', en: 'Lead hook', ka: 'წინა ჰუკი', figs: ['lhook'], tokens: ['3'],
    steps: [
      'იდაყვი მხრის დონეზეა, მკლავი დაახლოებით 90°-ით მოხრილი და მთელი დარტყმის განმავლობაში ასე რჩება.',
      'წინა ფეხის წვერზე ტრიალებ და თეძოს, მხრებს ერთად აბრუნებ. მუშტს ტანის ბრუნვა წაიყვანს და არა მკლავის გაშლა.',
      'უკანა ხელი სახეს იცავს. დარტყმის ბოლოს მხარი ნიკაპს ფარავს.'],
    mistake: 'მკლავი დიდი რკალით გადის ან ხელს ფართოდ წევ უკან. ბრუნვა ტანიდან უნდა იყოს.' },
  { id: 'rhook', group: 'punches', chip: '4', en: 'Rear hook', ka: 'უკანა ჰუკი', figs: ['rhook'], tokens: ['4'],
    steps: [
      'იდაყვი მხრის დონეზეა, მკლავი 90°-ზე მოხრილი.',
      'უკანა ფეხზე ტრიალებ, თეძო და მხრები ერთად ბრუნავს წინა მხარეს.',
      'წინა ხელი სახეს იცავს. წონა თანდათან წინა ფეხზე გადადის და მერე უკან ბრუნდება.'],
    mistake: 'წონასწორობას კარგავ ზედმეტი ბრუნვით. ბრუნვა იქ გააჩერე, სადაც მუშტი მიზანს ხვდება.' },
  { id: 'lupper', group: 'punches', chip: '5', en: 'Lead uppercut', ka: 'წინა აპერკოტი', figs: ['lupper'], tokens: ['5'],
    steps: [
      'მუხლებით ოდნავ დაიწიე და წინა მხარე ოდნავ დაბლა დაუშვი.',
      'ფეხებით ამოაგდე ხელი ქვემოდან ზევით, ნიკაპისკენ. მკლავი მოკლე რკალით მოძრაობს.',
      'უკანა ხელი სახესთან რჩება. დარტყმის შემდეგ ხელი სწრაფად დააბრუნე.'],
    mistake: 'ხელს ძალიან დაბლა წევ დარტყმამდე, დარტყმა გრძელი გზით მოდის და მოწინააღმდეგე ხედავს.' },
  { id: 'rupper', group: 'punches', chip: '6', en: 'Rear uppercut', ka: 'უკანა აპერკოტი', figs: ['rupper'], tokens: ['6'],
    steps: [
      'მუხლებით დაიწიე და მხრებს ოდნავ დაბლა დაუშვი უკანა მხარეს.',
      'უკანა ფეხის ბიძგით და თეძოს ბრუნვით ამოაგდე მუშტი ქვემოდან ზევით.',
      'წინა ხელი სახეს იცავს. დარტყმის შემდეგ პოზიცია დააბრუნე.'],
    mistake: 'მხოლოდ მხარით ისვრი. ძალა ფეხებიდან და თეძოდან უნდა ამოვიდეს.' },
  { id: 'body', group: 'punches', chip: '2', en: 'Body shots', ka: 'დარტყმა ტანში', figs: ['body'], tokens: ['1b', '2b', '3b'],
    steps: [
      'ტანში დასარტყმელად მუხლებით დაიხარე, ზურგი სწორი რჩება. წელში ნუ მოიხრები.',
      'თავი გვერდზე გაიტანე ხაზიდან, რომ პასუხად დარტყმას გადაურჩე.',
      'დარტყმის შემდეგ სწრაფად ამოდი და ხელები სახესთან დააბრუნე.'],
    mistake: 'წელში იხრები და სახე ღია გრჩება. დაბლა მუხლებით გადადი.' },
  { id: 'over', group: 'punches', chip: 'OVER', en: 'Overhand', ka: 'ოვერჰენდი', figs: ['over'], tokens: ['oh'],
    steps: [
      'ოვერჰენდი რკალით ზემოდან მოდის. ოდნავ დაიხარე გვერდზე და უკანა ხელი რკალში გაატარე.',
      'თეძო და მხარი ერთად ბრუნავს. მუშტი ზემოდან ეცემა მოწინააღმდეგის დაცვის გვერდით.',
      'მხარი ნიკაპს ფარავს. დარტყმის შემდეგ ხელი სახესთან დააბრუნე.'],
    mistake: 'ხელს ძალიან მაღლა წევ ან წინ ზედმეტად გადახრი და წონასწორობა გეკარგება.' },
  { id: 'slip', group: 'defence', chip: 'SLIP', en: 'Slip', ka: 'გაცდენა', figs: [], tokens: ['sl'],
    steps: [
      'ფეხებით და მხრებით ოდნავ გადაინაცვლე მარჯვნივ ან მარცხნივ, თავი დარტყმის ხაზს გადაუხვევს.',
      'მოძრაობა მცირეა: 10 – 15 სმ საკმარისია. წელში არ იხრები.',
      'მზერა მოწინააღმდეგეზე, ხელები სახესთან, მყისვე უპასუხე კონტრით.'],
    mistake: 'ზედმეტად დიდ მოძრაობას აკეთებ და ვეღარ პასუხობ. თვალს ხუჭავ.' },
  { id: 'duck', group: 'defence', chip: 'DUCK', en: 'Duck', ka: 'დახრა', figs: ['duck'], tokens: ['du'],
    steps: [
      'მუხლებით დაიხარე, წელით არა. ზურგი სწორია.',
      'ხელები სახესთან რჩება, თავი დარტყმის ხაზს ქვემოთ გადის.',
      'მერე სწრაფად ამოდი ფეხებით და უპასუხე.'],
    mistake: 'წელში იხრები და წინ გადაგაქვს თავი: ეს ზუსტად ის ადგილია, სადაც დარტყმა გხვდება.' },
  { id: 'back', group: 'defence', chip: 'BACK', en: 'Step back', ka: 'უკან გადადგომა', figs: ['back'], tokens: ['bk'],
    steps: [
      'უკანა ფეხი პირველი მოძრაობს, წინა ფეხი მიჰყვება. ფეხებს შორის მანძილი იგივე რჩება.',
      'ზედა სხეულით უკან არ გადაიხრები, მხრები ფეხებზეა.',
      'ხელები სახესთან რჩება. გადადგომის შემდეგ მზად ხარ ახალი დარტყმისთვის.'],
    mistake: 'ფეხებს ერთმანეთს ადებ ან ტანით უკან იხრები და წონასწორობას კარგავ.' },
  { id: 'pivot', group: 'defence', chip: 'TURN', en: 'Pivot', ka: 'შემობრუნება', figs: [], tokens: ['pv'],
    steps: [
      'წინა ფეხის წვერზე შემოტრიალდი, უკანა ფეხი წრეს შემოუვლის.',
      'შედეგად მოწინააღმდეგის ხაზიდან გამოდიხარ და ახალი კუთხიდან დგახარ.',
      'ხელები სახესთან რჩება. შემობრუნების შემდეგ ისევ სტოიკაში დადექი.'],
    mistake: 'ორივე ფეხი ერთდროულად გადააქვს და წონასწორობა ქრება.' },
  { id: 'parry', group: 'defence', chip: 'PARRY', en: 'Parry', ka: 'მოგერიება', figs: [], tokens: ['pa'],
    steps: [
      'მოწინააღმდეგის ხელს ხელისგულით მსუბუქად გვერდზე ჩამოაცდენ.',
      'მოძრაობა პატარაა, იდაყვი ტანთან რჩება.',
      'მოგერიების შემდეგ მყისვე შეუტიე, ეს კონტრის საუკეთესო მომენტია.'],
    mistake: 'ხელს ძალიან შორს აგდებ ან მთელ მკლავს ამოძრავებ და სახე ღია გრჩება.' },
  { id: 'block', group: 'defence', chip: 'BLOCK', en: 'Block', ka: 'ბლოკი', figs: [], tokens: ['bl'],
    steps: [
      'ხელთათმანები სახეზე ჩაკეტე, იდაყვები ერთად, ნიკაპი დაბლა.',
      'დარტყმას ხელზე და მკლავზე იღებ, თავზე კი არა.',
      'მაშინვე მომზადდი პასუხისთვის, ბლოკში დიდხანს ნუ დარჩები.'],
    mistake: 'თვალს ხუჭავ ან ხელებს ზედმეტად ფართოდ ხსნი.' },
  { id: 'roll', group: 'defence', chip: 'ROLL', en: 'Roll', ka: 'გადაგორება', figs: [], tokens: ['ro'],
    steps: [
      'ჰუკის ქვეშ მუხლებით დაიხარე და თავი რკალით გადაიტანე მეორე მხარეს.',
      'ხელები სახესთან რჩება. მხრები და თავი ერთად მოძრაობს.',
      'მეორე მხარეს ამოსვლისას მზად იყავი ჰუკით ან კროსით უპასუხო.'],
    mistake: 'წელით იხრები და ხელებს აგდებ. გადაგორება ფეხებიდან უნდა წამოვიდეს.' },
  { id: 'feint', group: 'defence', chip: 'FEINT', en: 'Feint', ka: 'ფინტი', figs: [], tokens: ['fe'],
    steps: [
      'მხრის ან ხელის სწრაფი, პატარა მოძრაობა, რომელიც მოწინააღმდეგეს რეაქციას აიძულებს.',
      'ფინტის დროს დარტყმას არ ასრულებ. ფინტი სიმართლეს უნდა ჰგავდეს.',
      'რეაქციის მომენტში ნამდვილი დარტყმა გაატარე.'],
    mistake: 'ფინტი ძალიან ნელია ან ზედმეტად დიდი, სხეული ბალანსს კარგავს.' },
  { id: 'circle', group: 'footwork', chip: 'LEFT', en: 'Circle left / right', ka: 'წრე მარცხნივ / მარჯვნივ', figs: [], tokens: ['cl', 'cr'],
    steps: [
      'გადაადგილებისას პირველი იმ მხარის ფეხი მოძრაობს, საითაც მიდიხარ. მარცხნივ წასვლისას მარცხენა ფეხი, მარჯვნივ მარჯვენა.',
      'მეორე ფეხი მიჰყვება და სტოიკა ისევ იგივე ხდება. ფეხებს არასოდეს გადაიჯვარედინებ.',
      'ნაბიჯები მცირეა და სწრაფი. მუხლები მოხრილია, ხელები სახესთან.'],
    mistake: 'ფეხებს ერთმანეთთან მოაქვს ან ჯვარედინად გადაიტან და წონასწორობას კარგავ.' },
  { id: 'angle', group: 'footwork', chip: 'ANGLE', en: 'Cut the angle', ka: 'კუთხის გადაჭრა', figs: [], tokens: ['ag'],
    steps: [
      'დარტყმის შემდეგ ნაბიჯი გააკეთე 45°-ით გვერდზე, რომ მოწინააღმდეგის წინა ხაზიდან გახვიდე.',
      'ახალი კუთხიდან ისევ მისკენ ხარ მიმართული და შემდეგ დარტყმა გაატარე.',
      'მოძრაობისას ხელები სახესთან დარჩეს.'],
    mistake: 'დარტყმის შემდეგ ადგილზე რჩები და წინ გიპირისპირდება. გვერდზე გადადექი.' }
];
const CARD_BY_ID = {};
CARDS.forEach(c => { CARD_BY_ID[c.id] = c; });
const GROUPS = [
  { id: 'basics', title: 'საფუძველი' },
  { id: 'punches', title: 'დარტყმები' },
  { id: 'defence', title: 'დაცვა' },
  { id: 'footwork', title: 'ფეხები' }
];

// short form cue per move: Georgian text on screen, English phrase for the coach voice
Object.assign(FORM, {
  '1':  { say: 'Snap it out and back', ka: 'გაისროლე სწრაფად და იმავე გზით დააბრუნე. უკანა ხელი სახესთანაა.' },
  '2':  { say: 'Pivot, hip, punch', ka: 'უკანა ფეხი ბრუნავს, თეძო წინ, მერე მხარი და მუშტი. წინა ხელი სახესთანაა.' },
  '3':  { say: 'Elbow up and turn', ka: 'იდაყვი მხრის დონეზე, ბრუნვა წინა ფეხიდან და თეძოდან.' },
  '4':  { say: 'Turn through the hips', ka: 'ბრუნვა უკანა ფეხიდან: თეძო და მხარი ერთად.' },
  '5':  { say: 'Dip and drive up', ka: 'მუხლებით დაიწიე და ფეხებით ამოაგდე ხელი ქვემოდან ზევით.' },
  '6':  { say: 'Dip and drive up', ka: 'უკანა ფეხით ბიძგი, მუშტი ქვემოდან ზევით.' },
  '1b': { say: 'Bend the knees', ka: 'მუხლებით დაიხარე, ზურგი სწორია, მერე დარტყმა.' },
  '2b': { say: 'Bend the knees', ka: 'მუხლებით დაიხარე, ზურგი სწორია, მერე კროსი ტანში.' },
  '3b': { say: 'Bend the knees', ka: 'მუხლებით დაიხარე, ზურგი სწორია, მერე ჰუკი ტანში.' },
  'oh': { say: 'Arc over the top', ka: 'რკალი ზემოდან, ტანი ბრუნავს, მხარი ნიკაპს ფარავს.' },
  'sl': { say: 'Slip the line', ka: 'სხეული ოდნავ გვერდზე, თავი ხაზიდან გადის, ხელები სახესთანაა.' },
  'du': { say: 'Bend the knees', ka: 'მუხლებით დაიხარე და არა წელით. ხელები სახესთანაა.' },
  'bk': { say: 'Back foot first', ka: 'უკანა ფეხი პირველი, წინა მიჰყვება. ფეხებს ნუ გადაიჯვარედინებ.' },
  'pv': { say: 'Turn on the lead foot', ka: 'წინა ფეხის წვერზე შემოტრიალდი, უკანა ფეხი შემოუვლის.' },
  'pa': { say: 'Small and sharp', ka: 'პატარა მოძრაობა ხელისგულით, იდაყვი ტანთანაა.' },
  'bl': { say: 'Hands tight', ka: 'ხელები სახეზე ჩაკეტე, იდაყვები ერთად, ნიკაპი დაბლა.' },
  'ro': { say: 'Bend and roll under', ka: 'მუხლებით დაიხარე და თავი რკალით გადაიტანე.' },
  'fe': { say: 'Quick and small', ka: 'სწრაფი, პატარა მოძრაობა. ბალანსი არ დაკარგო.' },
  'cl': { say: 'Left foot first', ka: 'მარცხენა ფეხი პირველი, მარჯვენა მიჰყვება.' },
  'cr': { say: 'Right foot first', ka: 'მარჯვენა ფეხი პირველი, მარცხენა მიჰყვება.' },
  'ag': { say: 'Step off the line', ka: 'ნაბიჯი 45°-ით გვერდზე და ახალი კუთხიდან დაარტყი.' }
});

const GLOSSARY = [
  ['Stance', 'დგომა', 'ბოქსის საბაზო პოზიცია: ფეხები, მუხლები და ხელები.'],
  ['Guard', 'დაცვითი პოზიცია', 'ხელები სახესთან, იდაყვები ტანთან.'],
  ['Lead / Rear', 'წინა / უკანა', 'წინა ხელი და ფეხი მოწინააღმდეგესთან უფრო ახლოა, უკანა კი მოშორებით.'],
  ['Combo', 'კომბინაცია', 'რამდენიმე დარტყმა ზედიზედ, ერთი სერიით.'],
  ['Counter', 'კონტრა', 'პასუხი მოწინააღმდეგის დარტყმაზე დაცვის შემდეგ.'],
  ['Footwork', 'ფეხების მუშაობა', 'გადაადგილება, წრეები, კუთხეები.'],
  ['Round', 'რაუნდი', 'ერთი ხანგრძლივი მონაკვეთი დასვენებებს შორის.'],
  ['Shadow boxing', 'ჩრდილთან ბოქსი', 'ბოქსი წარმოსახვით მოწინააღმდეგესთან, პარტნიორის გარეშე.'],
  ['Flurry', 'სერია', 'სწრაფი, შეუჩერებელი დარტყმები ზედიზედ.'],
  ['Angle', 'კუთხე', 'მოწინააღმდეგესთან მიმართებით შენი პოზიცია გვერდზე.']
];

/* ---------- Course: 4 weeks, 12 lessons ---------- */
const PURE = { warm: false, cool: false, finisher: false, ramp: false, bpm: 0 };
const lessonCfg = (over) => Object.assign({}, PURE, over);
const LESSONS = [
  { week: 1, title: 'დგომა და ფეხები', goal: 'სწორი პოზიცია და გადაადგილება წრეში.', cards: ['stance', 'circle'],
    plan: { kind: 'drill', combo: 'cl cr', step: 2600, cfg: lessonCfg({ rounds: 2, len: 60, rest: 20, mode: 'combo' }), ready: 'დადექი სტოიკაში და მოემზადე. ყურადღება ფეხებზე: წონა ორივე ფეხზეა.' } },
  { week: 1, title: 'ჯები', goal: 'სწრაფი, სუფთა ჯები და ხელის დაბრუნება.', cards: ['jab'],
    plan: { kind: 'drill', combo: '1', step: 2000, cfg: lessonCfg({ rounds: 3, len: 60, rest: 20, mode: 'combo' }) } },
  { week: 1, title: 'ჯები და კროსი', goal: 'ორი დარტყმა ერთ სერიად: ჯერ ნელა, მერე გაიზარდე.', cards: ['cross'],
    plan: { kind: 'build', combo: '1 2', cfg: lessonCfg({ rounds: 3, len: 90, rest: 20, mode: 'combo', tempo: 'slow' }) } },
  { week: 2, title: 'წინა ჰუკი', goal: 'ჰუკი ტანის ბრუნვით და არა მკლავის გაშლით.', cards: ['lhook'],
    plan: { kind: 'drill', combo: '3', step: 2200, cfg: lessonCfg({ rounds: 3, len: 60, rest: 20, mode: 'combo' }) } },
  { week: 2, title: 'უკანა ჰუკი', goal: 'ბრუნვა უკანა ფეხიდან და წონასწორობის შენარჩუნება.', cards: ['rhook'],
    plan: { kind: 'drill', combo: '4', step: 2200, cfg: lessonCfg({ rounds: 3, len: 60, rest: 20, mode: 'combo' }) } },
  { week: 2, title: 'სერია ჰუკით', goal: 'ჯები, კროსი, ჰუკი, კროსი: ჯაჭვის აგება ეტაპობრივად.', cards: ['lhook', 'cross'],
    plan: { kind: 'build', combo: '1 2 3 2', cfg: lessonCfg({ rounds: 3, len: 90, rest: 20, mode: 'combo', tempo: 'slow' }) } },
  { week: 3, title: 'წინა აპერკოტი', goal: 'ბიძგი ფეხებიდან და მოკლე რკალი ქვემოდან ზევით.', cards: ['lupper'],
    plan: { kind: 'drill', combo: '5', step: 2200, cfg: lessonCfg({ rounds: 3, len: 60, rest: 20, mode: 'combo' }) } },
  { week: 3, title: 'უკანა აპერკოტი', goal: 'თეძოს ბრუნვა და ბიძგი უკანა ფეხით.', cards: ['rupper'],
    plan: { kind: 'drill', combo: '6', step: 2200, cfg: lessonCfg({ rounds: 3, len: 60, rest: 20, mode: 'combo' }) } },
  { week: 3, title: 'ჯები, კროსი, აპერკოტი', goal: 'სერიები აპერკოტებით და ჰუკებით, საშუალო ტემპით.', cards: ['lupper', 'rupper'],
    plan: { kind: 'pool', pool: ['1 2 5', '1 2 5 2', '1 6 3 2', '5 6 3 2', '1 2 3 6'], cfg: lessonCfg({ rounds: 3, len: 90, rest: 20, mode: 'combo', tempo: 'mid' }) } },
  { week: 4, title: 'გაცდენა და დახრა', goal: 'თავის მოძრაობა: მცირე, სუფთა და ხელებით დაცული.', cards: ['slip', 'duck'],
    plan: { kind: 'drill', combo: 'sl du', step: 2400, cfg: lessonCfg({ rounds: 3, len: 60, rest: 20, mode: 'combo' }) } },
  { week: 4, title: 'დაცვა და კონტრა', goal: 'დაიცავი თავი და უპასუხე: წითელი ნიშანი ნიშნავს, რომ დარტყმა გიახლოვდება.', cards: ['parry', 'block', 'back'],
    plan: { kind: 'counter', cfg: lessonCfg({ rounds: 3, len: 90, rest: 20, mode: 'counter', level: 'easy', tempo: 'slow' }) } },
  { week: 4, title: 'თავისუფალი რაუნდები', goal: 'ტრენერი აღარ გეძახის. რაუნდი ფოკუსით, რიტმით და ბოლო 10 წამის ფინიშერით.', cards: ['circle', 'angle'],
    plan: { kind: 'free', cfg: lessonCfg({ rounds: 3, len: 120, rest: 30, mode: 'free', bpm: 110, finisher: true }) } }
];
const WEEK_TITLES = { 1: 'კვირა 1. დგომა და ჯები', 2: 'კვირა 2. ჰუკები', 3: 'კვირა 3. აპერკოტები', 4: 'კვირა 4. დაცვა და თავისუფალი მუშაობა' };
// plans of kind 'pool' / 'counter' / 'free' reuse the normal caller, 'drill' / 'build' use the technique caller
const planOf = (lessonIndex) => {
  const L = LESSONS[lessonIndex];
  const p = Object.assign({}, L.plan, { lesson: lessonIndex, from: 'learn', title: L.title });
  if (p.kind === 'pool' || p.kind === 'counter' || p.kind === 'free') { p.cfg = Object.assign({}, p.cfg); }
  return p;
};
