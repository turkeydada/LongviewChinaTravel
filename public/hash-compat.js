// 旧版 #/ 链接兼容（早期分享出去的 hash 链接自动跳到干净路径，兼容老书签/老消息）
// 注意：必须以独立文件引入——站点 CSP 的 script-src 'self' 会拦截所有内联脚本
(function () {
  if (location.hash.startsWith("#/")) {
    history.replaceState(null, "", location.hash.slice(1) + location.search);
  }
})();
