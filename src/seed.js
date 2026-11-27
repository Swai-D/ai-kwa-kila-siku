// Sample bilingual content for local development. Safe to re-run: does nothing if posts exist.
const db = require('./db');

if (db.prepare('SELECT COUNT(*) AS n FROM posts').get().n > 0) {
  console.log('Posts already exist; seed skipped.');
  process.exit(0);
}

const categories = [
  ['misingi', 'Misingi ya A.I', 'AI Basics', 'Dhana za msingi kwa lugha rahisi', 'Core concepts in plain language'],
  ['miradi', 'Miradi', 'Projects', 'Miradi halisi ya A.I inayojengwa', 'Real A.I projects being built'],
  ['zana', 'Zana', 'Tools', 'Zana na mbinu za kutumia A.I', 'Tools and techniques for using A.I'],
  ['habari', 'Habari', 'News', 'Habari mpya za teknolojia', 'Fresh technology news'],
];
const tags = [
  ['machine-learning', 'Machine Learning', 'Machine Learning'],
  ['llm', 'LLM', 'LLM'],
  ['kilimo', 'Kilimo', 'Agriculture'],
  ['prompts', 'Prompts', 'Prompts'],
  ['data', 'Data', 'Data'],
];
const insCat = db.prepare('INSERT INTO categories (slug,name_sw,name_en,desc_sw,desc_en) VALUES (?,?,?,?,?)');
const insTag = db.prepare('INSERT INTO tags (slug,name_sw,name_en) VALUES (?,?,?)');
const catId = {};
const tagId = {};
categories.forEach((c) => (catId[c[0]] = insCat.run(...c).lastInsertRowid));
tags.forEach((t) => (tagId[t[0]] = insTag.run(...t).lastInsertRowid));

// [date, cover, category, tags, status, sw:{slug,title,excerpt,body}, en:{...} | null]
const posts = [
  ['2026-11-03 06:00:00', '/images/pic01.jpg', 'misingi', ['machine-learning'], 'published',
    { slug: 'akili-mnemba-ni-nini', title: 'Akili Mnemba (A.I) ni nini hasa?', excerpt: 'Maelezo rahisi ya A.I bila istilahi ngumu.',
      body: '<p>Akili Mnemba, au <strong>Artificial Intelligence (A.I)</strong>, ni uwezo wa kompyuta kufanya kazi ambazo kwa kawaida zinahitaji akili ya binadamu: kuelewa lugha, kutambua picha, kutoa maamuzi na kujifunza kutokana na uzoefu.</p><h3>Si uchawi</h3><p>A.I haifikiri kama binadamu. Inatumia hesabu na data nyingi kutafuta mifumo. Ukiipa mifano mingi ya picha za mihogo yenye ugonjwa, itajifunza kutambua dalili hizo kwenye picha mpya.</p><p>Katika makala zijazo tutaeleza kila dhana hatua kwa hatua, tukitumia mifano ya Afrika Mashariki.</p>' },
    { slug: 'what-is-artificial-intelligence', title: 'What exactly is Artificial Intelligence (A.I)?', excerpt: 'A plain explanation of A.I without the jargon.',
      body: '<p><strong>Artificial Intelligence (A.I)</strong> is the ability of computers to do tasks that normally need human intelligence: understanding language, recognising images, making decisions and learning from experience.</p><h3>It is not magic</h3><p>A.I does not think like a person. It uses maths and lots of data to find patterns. Show it many photos of diseased cassava leaves and it learns to spot those symptoms in new photos.</p><p>In upcoming posts we will explain each concept step by step, using East African examples.</p>' }],
  ['2026-11-06 06:00:00', '/images/pic02.jpg', 'misingi', ['machine-learning', 'data'], 'published',
    { slug: 'data-ni-mafuta-ya-ai', title: 'Data ni mafuta ya A.I', excerpt: 'Kwa nini data nzuri ni muhimu kuliko modeli kubwa.',
      body: '<p>Modeli ya A.I ni nzuri kama data iliyofundishwa nayo. Data chafu, chache au yenye upendeleo itazaa majibu mabaya.</p><ul><li><strong>Kiasi:</strong> mifano ya kutosha ya kila kisa.</li><li><strong>Ubora:</strong> lebo sahihi, hakuna makosa.</li><li><strong>Uwiano:</strong> data inayowakilisha hali halisi.</li></ul><p>Kabla ya kununua kompyuta yenye nguvu, anza kwa kukusanya data safi.</p>' },
    { slug: 'data-is-the-fuel-of-ai', title: 'Data is the fuel of A.I', excerpt: 'Why good data matters more than a bigger model.',
      body: '<p>An A.I model is only as good as the data it learned from. Dirty, scarce or biased data produces bad answers.</p><ul><li><strong>Quantity:</strong> enough examples of every case.</li><li><strong>Quality:</strong> correct labels, no mistakes.</li><li><strong>Balance:</strong> data that reflects reality.</li></ul><p>Before buying a powerful computer, start by collecting clean data.</p>' }],
  ['2026-11-10 06:00:00', '/images/pic03.jpg', 'misingi', ['machine-learning'], 'published',
    { slug: 'machine-learning-na-deep-learning', title: 'Machine Learning na Deep Learning: tofauti yake', excerpt: 'Ni vitu viwili tofauti, ingawa vinahusiana.',
      body: '<p><strong>Machine Learning (ML)</strong> ni njia ya kufundisha kompyuta kujifunza kutoka kwenye data badala ya kuandika kanuni kwa mkono. <strong>Deep Learning</strong> ni aina ya ML inayotumia mitandao ya neva yenye tabaka nyingi.</p><p>Fikiria A.I kama mwavuli mkubwa, ML ndani yake, na Deep Learning ndani ya ML. Deep Learning ndiyo inayowezesha ChatGPT, utambuzi wa picha na tafsiri ya sauti.</p>' },
    { slug: 'machine-learning-vs-deep-learning', title: 'Machine Learning vs Deep Learning: the difference', excerpt: 'Two different things, even though they are related.',
      body: '<p><strong>Machine Learning (ML)</strong> teaches computers to learn from data instead of hand-written rules. <strong>Deep Learning</strong> is a kind of ML that uses neural networks with many layers.</p><p>Picture A.I as a big umbrella, ML inside it, and Deep Learning inside ML. Deep Learning powers ChatGPT, image recognition and speech translation.</p>' }],
  ['2026-11-13 06:00:00', '/images/pic04.jpg', 'miradi', ['machine-learning', 'kilimo', 'data'], 'published',
    { slug: 'ai-kwa-wakulima-bei-za-mazao', title: 'A.I kwa wakulima: kutabiri bei za mazao', excerpt: 'Jinsi modeli ya ML inavyoweza kusaidia mkulima kuamua lini kuuza.',
      body: '<p>Bei za mazao hubadilika kila wiki. Mkulima akijua mwelekeo wa bei, anaweza kuamua kuuza sasa au kusubiri.</p><h3>Wazo la mradi</h3><p>Tunakusanya bei za soko za miaka kadhaa, tunaongeza msimu na hali ya hewa, kisha tunafundisha modeli ya ML kutabiri bei ya wiki zijazo.</p><p>Katika makala ijayo tutaonyesha hatua za kuijenga kwa Python.</p>' },
    { slug: 'ai-for-farmers-crop-price-prediction', title: 'A.I for farmers: predicting crop prices', excerpt: 'How an ML model can help a farmer decide when to sell.',
      body: '<p>Crop prices change every week. A farmer who knows the price trend can decide to sell now or wait.</p><h3>The project idea</h3><p>We collect several years of market prices, add season and weather, then train an ML model to forecast next weeks’ prices.</p><p>In the next post we will show how to build it in Python.</p>' }],
  ['2026-11-17 06:00:00', '/images/pic05.jpg', 'misingi', ['llm'], 'published',
    { slug: 'chatgpt-inafanyaje-kazi', title: 'ChatGPT inafanyaje kazi? Maelezo ya LLM', excerpt: 'Modeli kubwa za lugha zinatabiri neno linalofuata.',
      body: '<p>ChatGPT ni <strong>Large Language Model (LLM)</strong>. Kazi yake kuu ni rahisi: kutabiri neno (au kipande cha neno) linalofuata, tena na tena, hadi jibu likamilike.</p><p>Ili ifanye hivyo vizuri, ilisomeshwa maandishi mengi sana. Haihifadhi kurasa za mtandao; inajifunza mifumo ya lugha.</p><p>Ndiyo maana wakati mwingine inajibu kwa ujasiri jibu lisilo sahihi — kila mara hakikisha taarifa muhimu.</p>' },
    { slug: 'how-does-chatgpt-work', title: 'How does ChatGPT work? LLMs explained', excerpt: 'Large language models predict the next word.',
      body: '<p>ChatGPT is a <strong>Large Language Model (LLM)</strong>. Its core job is simple: predict the next word (or word piece), again and again, until the answer is complete.</p><p>To do that well it was trained on a huge amount of text. It does not store web pages; it learns patterns of language.</p><p>That is why it sometimes answers confidently and wrongly — always verify important information.</p>' }],
  ['2026-11-20 06:00:00', '/images/pic06.jpg', 'zana', ['prompts', 'llm'], 'published',
    { slug: 'mbinu-tano-za-kuandika-prompt-nzuri', title: 'Mbinu tano za kuandika prompt nzuri', excerpt: 'Maelekezo mazuri yanazaa majibu mazuri.',
      body: '<ol><li><strong>Eleza jukumu:</strong> “Wewe ni mwalimu wa hesabu wa shule ya sekondari.”</li><li><strong>Toa muktadha:</strong> hadhira, lengo na kikomo.</li><li><strong>Weka mfano:</strong> onyesha umbo la jibu unalotaka.</li><li><strong>Taja muundo:</strong> orodha, jedwali au aya fupi.</li><li><strong>Rudia na boresha:</strong> omba marekebisho badala ya kuanza upya.</li></ol>' },
    { slug: 'five-techniques-for-better-prompts', title: 'Five techniques for writing better prompts', excerpt: 'Good instructions produce good answers.',
      body: '<ol><li><strong>Set a role:</strong> “You are a high-school maths teacher.”</li><li><strong>Give context:</strong> audience, goal and limits.</li><li><strong>Add an example:</strong> show the shape of the answer you want.</li><li><strong>State the format:</strong> a list, a table or a short paragraph.</li><li><strong>Iterate:</strong> ask for edits instead of starting over.</li></ol>' }],
  ['2026-11-24 06:00:00', '/images/pic07.jpg', 'habari', ['llm'], 'published',
    { slug: 'ai-na-lugha-ya-kiswahili', title: 'A.I na lugha ya Kiswahili: tunaelekea wapi?', excerpt: 'Makala hii ipo kwa Kiswahili pekee kwa sasa.',
      body: '<p>Modeli nyingi za A.I zilifundishwa zaidi kwa Kiingereza, hivyo Kiswahili mara nyingi hupata matokeo dhaifu. Lakini hali inabadilika: data ya Kiswahili inaongezeka na jamii za watafiti zinajenga seti za data huria.</p><p>Tutaangalia kazi zinazoendelea na jinsi unavyoweza kuchangia.</p>' },
    null],
  ['2026-12-31 06:00:00', '/images/pic08.jpg', 'zana', [], 'published',
    { slug: 'makala-ya-baadaye', title: 'Makala iliyopangwa (haionekani bado)', excerpt: 'Hii ni makala iliyopangwa kuchapishwa baadaye.', body: '<p>Inaonyesha kuwa ratiba ya kuchapisha inafanya kazi.</p>' },
    { slug: 'scheduled-post', title: 'Scheduled post (not visible yet)', excerpt: 'This post is scheduled for later.', body: '<p>Shows that scheduling works.</p>' }],
];

const insPost = db.prepare('INSERT INTO posts (cover_image,status,published_at,category_id,views) VALUES (?,?,?,?,?)');
const insTr = db.prepare('INSERT INTO post_translations (post_id,lang,slug,title,excerpt,body) VALUES (?,?,?,?,?,?)');
const insPt = db.prepare('INSERT INTO post_tags (post_id,tag_id) VALUES (?,?)');

db.transaction(() => {
  posts.forEach(([date, cover, cat, tg, status, sw, en], i) => {
    const id = insPost.run(cover, status, date, catId[cat], (posts.length - i) * 7).lastInsertRowid;
    insTr.run(id, 'sw', sw.slug, sw.title, sw.excerpt, sw.body);
    if (en) insTr.run(id, 'en', en.slug, en.title, en.excerpt, en.body);
    tg.forEach((s) => insPt.run(id, tagId[s]));
  });
})();

console.log(`Seeded ${posts.length} posts, ${categories.length} categories, ${tags.length} tags.`);
