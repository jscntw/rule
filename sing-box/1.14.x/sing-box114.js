const { type, name } = $arguments;
let config = JSON.parse($files[0]);

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

// 删除订阅节点中与模板已有 outbound 重名的项目
const existingTags = new Set(config.outbounds.map(p => p.tag));
proxies = proxies.filter(p => !existingTags.has(p.tag));

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

// 核心处理
config.outbounds.forEach(i => {
  if (!Array.isArray(i.outbounds)) return;

  // 全选
  if (['all', 'all-auto'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies));
  }

  // 落地
  if (specialMap[i.tag]) {
    i.outbounds.push(...getTags(proxies, specialMap[i.tag]));
  }

  // 地区
  for (const [key, regex] of Object.entries(regionMap)) {
    if (i.tag === key || i.tag === `${key}-auto`) {
      i.outbounds.push(...getTags(proxies, regex));
    }
  }
});

// 兜底：没有节点的选择器使用 Direct
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    outbound.outbounds.push("Direct");
  }
});

// 最终统一修正 outbound 引用
function fixDirect(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(item => fixDirect(item));
    return;
  }

  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'outbounds' && Array.isArray(obj[key])) {
        obj[key] = obj[key].map(tag =>
          tag === 'direct' ? 'Direct' : tag
        );
      }

      fixDirect(obj[key]);
    }
  }
}

fixDirect(config);

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag);
}
