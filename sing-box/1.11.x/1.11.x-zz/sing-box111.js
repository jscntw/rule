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

// 4. 执行严谨的过滤逻辑
config.outbounds.forEach(outbound => {
  if (!outbound.outbounds || !Array.isArray(outbound.outbounds)) return;
  
  const matchConfig = regionConfig.find(conf => conf.tags.includes(outbound.tag));
  
  if (matchConfig) {
    outbound.outbounds = []; 
    let matchedTags = [];
    
    // 过滤函数：检查是否包含排除关键词
    const isExcluded = (p) => excludedKeywords.some(keyword => p.tag.includes(keyword));
    
    if (matchConfig.regex === null) {
      // all 组：直接过滤掉所有排除项
      matchedTags = proxies
        .filter(p => !isExcluded(p))
        .map(p => p.tag);
    } else {
      // 地区组：既要匹配正则，又要排除关键词
      matchedTags = proxies
        .filter(p => matchConfig.regex.test(p.tag) && !isExcluded(p))
        .map(p => p.tag);
    }
    
    // 5. 兜底处理
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
