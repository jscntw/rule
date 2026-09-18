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
  '美国-落地': /美国-中转落地/i,
  '日本-落地': /日本-中转落地/i,
  '星岛-落地': /星岛-中转落地/i,
  '春川-落地': /春川-中转落地/i,
  '韩国-落地': /韩国-中转落地/i,
  '台湾-落地': /台湾-中转落地/i,
  '香港-落地': /香港-中转落地/i
};

const regionMap = {
  'us': /🇺🇸|united\s?states|🇺🇲/i,
  'jp': /japan|🇯🇵/i,
  'sg': /singapore|🇸🇬/i,
  'kr': /korea|🇰🇷/i,
  'tw': /taiwan|🇹🇼/i,
  'hk': /hong\s?kong|🇭🇰/i,
  'chr': /🇳🇱/i
};

// 逻辑区：核心处理流程
config.outbounds.map(i => {
  if (!i.outbounds || !Array.isArray(i.outbounds)) return;

  // 全选逻辑
  if (['all', 'all-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies));
  }

  // 落地逻辑
  if (specialMap[i.tag]) {
    i.outbounds.push(...getTags(proxies, specialMap[i.tag]));
  }

  // 自动组逻辑 (完美支持 key 和 key-auto)
  for (const [key, regex] of Object.entries(regionMap)) {
    if (i.tag === key || i.tag === `${key}-auto`) {guan
      i.outbounds.push(...getTags(proxies, regex));
    }
  }
});

// 兜底逻辑
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    outbound.outbounds.push("Direct");
  }
});

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag);
}
