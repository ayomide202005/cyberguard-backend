// Takes the browser's user-agent text and returns a friendly browser name
function getBrowserName(userAgent = '') {
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('OPR') || userAgent.includes('Opera')) return 'Opera';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  return 'an unknown browser';
}

export default getBrowserName;