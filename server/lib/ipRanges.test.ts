import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedIp } from './ipRanges.ts';

describe('isBlockedIp', () => {
  it('blocks loopback and unspecified IPv4', () => {
    assert.equal(isBlockedIp('127.0.0.1'), true);
    assert.equal(isBlockedIp('127.255.255.254'), true);
    assert.equal(isBlockedIp('0.0.0.0'), true);
  });

  it('blocks private IPv4 ranges', () => {
    assert.equal(isBlockedIp('10.0.0.1'), true);
    assert.equal(isBlockedIp('172.16.0.1'), true);
    assert.equal(isBlockedIp('172.31.255.255'), true);
    assert.equal(isBlockedIp('192.168.1.10'), true);
  });

  it('blocks link-local IPv4 including the cloud metadata address', () => {
    assert.equal(isBlockedIp('169.254.169.254'), true);
    assert.equal(isBlockedIp('169.254.0.1'), true);
  });

  it('blocks CGNAT, benchmark, multicast and reserved IPv4', () => {
    assert.equal(isBlockedIp('100.64.0.1'), true);
    assert.equal(isBlockedIp('198.18.0.1'), true);
    assert.equal(isBlockedIp('224.0.0.1'), true);
    assert.equal(isBlockedIp('240.0.0.1'), true);
    assert.equal(isBlockedIp('255.255.255.255'), true);
  });

  it('allows public IPv4 including addresses just outside blocked ranges', () => {
    assert.equal(isBlockedIp('8.8.8.8'), false);
    assert.equal(isBlockedIp('1.1.1.1'), false);
    assert.equal(isBlockedIp('93.184.216.34'), false);
    assert.equal(isBlockedIp('172.15.0.1'), false);
    assert.equal(isBlockedIp('172.32.0.1'), false);
    assert.equal(isBlockedIp('100.63.255.255'), false);
    assert.equal(isBlockedIp('169.253.0.1'), false);
  });

  it('blocks loopback, unique-local, link-local and multicast IPv6', () => {
    assert.equal(isBlockedIp('::1'), true);
    assert.equal(isBlockedIp('::'), true);
    assert.equal(isBlockedIp('fc00::1'), true);
    assert.equal(isBlockedIp('fd12:3456::1'), true);
    assert.equal(isBlockedIp('fe80::1'), true);
    assert.equal(isBlockedIp('ff02::1'), true);
  });

  it('blocks IPv4-mapped IPv6 pointing at internal addresses', () => {
    assert.equal(isBlockedIp('::ffff:127.0.0.1'), true);
    assert.equal(isBlockedIp('::ffff:10.0.0.1'), true);
  });

  it('allows public IPv6', () => {
    assert.equal(isBlockedIp('2001:4860:4860::8888'), false);
    assert.equal(isBlockedIp('::ffff:8.8.8.8'), false);
  });
});
