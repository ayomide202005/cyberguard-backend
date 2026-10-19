// Works out the security score, the four bars and the recommendations.
// It only does maths on the data we give it. It never talks to the database.
function calculateSecurity({ user, devices, openAlertCount }) {
  // ----- Password Security: how old is the password? -----
  const msPerDay = 1000 * 60 * 60 * 24;
  const passwordAgeDays = Math.floor((Date.now() - new Date(user.passwordChangedAt)) / msPerDay);

  let password = 40;
  if (passwordAgeDays <= 90) password = 100;
  else if (passwordAgeDays <= 180) password = 80;
  else if (passwordAgeDays <= 365) password = 60;

  // ----- Account Security: 2FA and unresolved alerts -----
  let account = 100;
  if (!user.twoFactorEnabled) account -= 40;
  account -= openAlertCount * 15;
  if (account < 0) account = 0;

  // ----- Device Security: what share of devices are trusted? -----
  const trustedCount = devices.filter((device) => device.isTrusted).length;
  const untrustedCount = devices.length - trustedCount;

  let device = 100;
  if (devices.length > 0) {
    device = Math.round((trustedCount / devices.length) * 100);
  }

  // ----- Privacy: placeholder until we add privacy settings -----
  const privacy = 80;

  // ----- Overall score: the average of the four bars -----
  const score = Math.round((password + account + device + privacy) / 4);

  let label = 'At risk';
  if (score >= 80) label = 'Good';
  else if (score >= 60) label = 'Fair';

  // ----- Recommendations -----
  const recommendations = [];

  if (!user.twoFactorEnabled) {
    recommendations.push({ status: 'warning', text: 'Enable 2FA' });
  }

  if (openAlertCount > 0) {
    recommendations.push({
      status: 'warning',
      text: `Review ${openAlertCount} security alert${openAlertCount > 1 ? 's' : ''}`,
    });
  }

  if (untrustedCount > 0) {
    recommendations.push({ status: 'warning', text: 'Review connected devices' });
  }

  if (passwordAgeDays > 90) {
    recommendations.push({
      status: 'warning',
      text: `Change your password (last changed ${passwordAgeDays} days ago)`,
    });
  } else {
    recommendations.push({ status: 'success', text: 'Password changed recently' });
  }

  return {
    score,
    label,
    breakdown: { password, account, device, privacy },
    recommendations,
  };
}

export default calculateSecurity;