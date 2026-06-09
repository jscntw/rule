const { type, name } = $arguments;
const compatible_outbound = {
  tag: 'COMPATIBLE-DIRECT',
  type: 'direct',
};
let hasCompatibleAdded = false;

// 1. 加载配置与节点
let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

config.outbounds.push(...proxies);

// 2. 定义排除关键词（落地节点黑名单）
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

// 3. 定义分组规则（用于其他常规分组）
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

// 4.1 核心逻辑：先将“落地”节点精确填充到各自的落地分组中
Object.keys(specialMap).forEach(groupTag => {
  const group = config.outbounds.find(o => o.tag === groupTag);
  if (group) {
    group.outbounds = proxies
      .filter(p => specialMap[groupTag].test(p.tag))
      .map(p => p.tag);
  }
});

// 4.2 数据预清洗：为其他分组准备“干净”的节点池（移除所有落地节点）
const cleanProxies = proxies.filter(p => 
  !excludedKeywords.some(keyword => p.tag.includes(keyword))
);

// 5. 执行其他分组（all, us, jp等）的分类填充
config.outbounds.forEach(outbound => {
  // 跳过已经处理过的落地分组
  if (specialMap.hasOwnProperty(outbound.tag)) return;
  
  if (!outbound.outbounds || !Array.isArray(outbound.outbounds)) return;
  
  const matchConfig = regionConfig.find(conf => conf.tags.includes(outbound.tag));
  
  if (matchConfig) {
    outbound.outbounds = []; 
    let matchedTags = [];
    
    if (matchConfig.regex === null) {
      // all 组：直接使用清洗后的节点池
      matchedTags = cleanProxies.map(p => p.tag);
    } else {
      // 地区组：在清洗后的池子里匹配正则
      matchedTags = cleanProxies
        .filter(p => matchConfig.regex.test(p.tag))
        .map(p => p.tag);
    }
    
    // 兜底处理
    if (matchedTags.length === 0) {
      if (!hasCompatibleAdded) {
        config.outbounds.push(compatible_outbound);
        hasCompatibleAdded = true;
      }
      outbound.outbounds.push(compatible_outbound.tag);
    } else {
      outbound.outbounds.push(...matchedTags);
    }
  }
});

$content = JSON.stringify(config, null, 2);
