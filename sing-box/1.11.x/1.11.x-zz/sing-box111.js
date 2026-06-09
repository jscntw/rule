const { type, name } = $arguments;
const compatible_outbound = {
  tag: 'COMPATIBLE-DIRECT',
  type: 'direct',
};

// 1. 加载配置与节点
let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

config.outbounds.push(...proxies);

// 2. 定义排除关键词
const specialMap = {
  '美国-落地': /美国-落地/i,
  '日本-落地': /日本-落地/i,
  '新加坡-落地': /新加坡-落地/i,
  '春川-落地': /春川-落地/i,
  '韩国-落地': /韩国-落地/i,
  '台湾-落地': /台湾-落地/i,
  '香港-落地': /香港-落地/i
};
const excludedKeywords = Object.keys(specialMap);

// 3. 定义分组规则
const regionConfig = [
  { tags: ['hk', 'hk-auto'], regex: /🇭🇰|港|hk/i },
  { tags: ['tw', 'tw-auto'], regex: /🇹🇼|台|tw/i },
  { tags: ['jp', 'jp-auto'], regex: /🇯🇵|日|jp/i },
  { tags: ['sg', 'sg-auto'], regex: /🇸🇬|新|sg/i },
  { tags: ['kr', 'kr-auto'], regex: /🇰🇷|韩|kr/i },
  { tags: ['us', 'us-auto'], regex: /🇺🇲|🇺🇸|美|us/i },
  { tags: ['chr', 'chr-auto'], regex: /🇳🇱/i },
  { tags: ['all', 'all-auto'], regex: null }
];

// 4.1 填充落地节点
Object.keys(specialMap).forEach(groupTag => {
  const group = config.outbounds.find(o => o.tag === groupTag);
  if (group) {
    const matched = proxies.filter(p => specialMap[groupTag].test(p.tag)).map(p => p.tag);
    // 如果没有节点，依然保留 [""]
    group.outbounds = matched.length > 0 ? matched : [""];
  }
});

// 4.2 数据清洗
const cleanProxies = proxies.filter(p => 
  !excludedKeywords.some(keyword => p.tag.includes(keyword))
);

// 5. 执行常规分组填充
config.outbounds.forEach(outbound => {
  if (specialMap.hasOwnProperty(outbound.tag)) return;
  if (!outbound.outbounds || !Array.isArray(outbound.outbounds)) return;
    
  const matchConfig = regionConfig.find(conf => conf.tags.includes(outbound.tag));
  
  if (matchConfig) {
    let matchedTags = [];
    if (matchConfig.regex === null) {
      matchedTags = cleanProxies.map(p => p.tag);
    } else {
      matchedTags = cleanProxies
        .filter(p => matchConfig.regex.test(p.tag))
        .map(p => p.tag);
    }
    
    // --- 核心修改：如果匹配结果为空，强制设置回 [""] ---
    outbound.outbounds = matchedTags.length > 0 ? matchedTags : [""];
  }
});

$content = JSON.stringify(config, null, 2);
