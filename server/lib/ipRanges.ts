// Nhận diện IP thuộc dải nội bộ / không định tuyến công cộng, dùng chung cho
// validate literal host và guard DNS lookup ở tầng kết nối (phòng SSRF).

function isBlockedIpv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return true; // octet quá 255 -> coi như không hợp lệ, chặn

  if (a === 0) return true; // 0.0.0.0/8 ("this network")
  if (a === 10) return true; // private 10.0.0.0/8
  if (a === 127) return true; // loopback 127.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16 (metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
  if (a === 192 && b === 168) return true; // private 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark 198.18.0.0/15
  if (a >= 224) return true; // multicast 224/4 + reserved 240/4 + broadcast
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  let host = ip.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }

  // IPv4-mapped / embedded (::ffff:a.b.c.d, ::ffff:0:a.b.c.d) -> soi phần IPv4
  const embeddedV4 = host.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embeddedV4) return isBlockedIpv4(embeddedV4[1]);

  if (host === '::1' || host === '::') return true; // loopback / unspecified
  const firstGroup = host.split(':')[0];
  if (/^f[cd]/.test(firstGroup)) return true; // unique-local fc00::/7
  if (/^fe[89ab]/.test(firstGroup)) return true; // link-local fe80::/10
  if (/^ff/.test(firstGroup)) return true; // multicast ff00::/8
  return false;
}

export function isBlockedIp(ip: string): boolean {
  return ip.includes(':') ? isBlockedIpv6(ip) : isBlockedIpv4(ip);
}
