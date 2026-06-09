const { type, name } = $arguments;
const compatible_outbound = {
  tag: 'COMPATIBLE-DIRECT',
  type: 'direct',
};
let hasCompatibleAdded = false;

// 1. 加载基础配置与节点
let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

config.outbounds.push(...proxies);

// 2. 定义排除关键词与映射表
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

// 4. 执行过滤与填充
config.outbounds.forEach(outbound => {
  if (!outbound.outbounds || !Array.isArray(outbound.outbounds)) return;
  
  const matchConfig = regionConfig.find(conf => conf.tags.includes(outbound.tag));
  
  if (matchConfig) {
    // 强制清空原有内容，包括 [""]
    outbound.outbounds = []; 
    
    let matchedTags = [];
    
    if (matchConfig.regex === null) {
      // 核心：排除逻辑
      // 筛选：节点名不包含任何落地关键字的节点
      matchedTags = proxies
        .filter(p => !excludedKeywords.some(keyword => p.tag.includes(keyword)))
        .map(p => p.tag);
    } else {
      matchedTags = proxies
        .filter(p => matchConfig.regex.test(p.tag))
        .map(p => p.tag);
    }
    
    // 如果过滤后为空，则使用兜底策略
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

// 5. 输出最终配置
$content = JSON.stringify(config, null, 2);
