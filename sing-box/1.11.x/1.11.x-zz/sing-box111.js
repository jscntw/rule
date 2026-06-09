const { type, name } = $arguments;
const compatible_outbound = {
  tag: 'COMPATIBLE-DIRECT',
  type: 'direct',
};
let hasCompatibleAdded = false;

let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

config.outbounds.push(...proxies);

const specialMap = {
  '美国-落地': /美国-落地/i,
  '日本-落地': /日本-落地/i,
  '新加坡-落地': /新加坡-落地/i,
  '春川-落地': /春川-落地/i,
  '韩国-落地': /韩国-落地/i,
  '台湾-落地': /台湾-落地/i,
  '香港-落地': /香港-落地/i
};

// 自动提取需要排除的关键词
const excludedKeywords = Object.keys(specialMap);

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

config.outbounds.forEach(outbound => {
  if (!outbound.outbounds || !Array.isArray(outbound.outbounds)) return;
  
  const matchConfig = regionConfig.find(conf => conf.tags.includes(outbound.tag));
  
  if (matchConfig) {
    outbound.outbounds = [];
    let matchedTags = [];
    
    if (matchConfig.regex === null) {
      // 排除逻辑：tag 中不包含任何“落地”关键词的节点才会被选中
      matchedTags = proxies
        .filter(p => !excludedKeywords.some(keyword => p.tag.includes(keyword)))
        .map(p => p.tag);
    } else {
      matchedTags = proxies
        .filter(p => matchConfig.regex.test(p.tag))
        .map(p => p.tag);
    }
    
    outbound.outbounds.push(...matchedTags);
    
    // 如果没有任何匹配，加入兜底策略
    if (outbound.outbounds.length === 0) {
      if (!hasCompatibleAdded) {
        config.outbounds.push(compatible_outbound);
        hasCompatibleAdded = true;
      }
      outbound.outbounds.push(compatible_outbound.tag);
    }
  }
});

$content = JSON.stringify(config, null, 2);
