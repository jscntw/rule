const { type, name } = $arguments;
let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

config.outbounds.push(...proxies);

// 配置区：只需在这里增减地区
const specialMap = {
  '美国-落地专机': /美国-落地/i,
  '日本-落地专机': /日本-落地/i,
  '新加坡-落地专机': /新加坡-落地/i,
  'chr-落地专机': /chr-落地/i,
  '韩国-落地专机': /韩国-落地/i,
  '台湾-落地专机': /台湾-落地/i,
  '香港-落地专机': /香港-落地/i
};

const regionMap = {
  'us': /🇺🇸|us|united\s?states|🇺🇲/i,
  'jp': /jp|japan|🇯🇵/i,
  'sg': /sg|singapore|🇸🇬/i,
  'kr': /kr|korea|🇰🇷/i,
  'tw': /tw|taiwan|🇹🇼/i,
  'hk': /hk|hong\s?kong|🇭🇰/i,
  'chr': /🇳🇱/i
};

// 逻辑区：核心处理流程
config.outbounds.map(i => {
  if (!i.outbounds || !Array.isArray(i.outbounds)) return;

  // 全选逻辑
  if (['all', 'all-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies));
  }

  // 落地专机逻辑
  if (specialMap[i.tag]) {
    i.outbounds.push(...getTags(proxies, specialMap[i.tag]));
  }

  // 自动组逻辑 (完美支持 key 和 key-auto)
  for (const [key, regex] of Object.entries(regionMap)) {
    if (i.tag === key || i.tag === `${key}-auto`) {
      i.outbounds.push(...getTags(proxies, regex));
    }
  }
});

// 兜底逻辑
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    outbound.outbounds.push("direct");
  }
});

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag);
}