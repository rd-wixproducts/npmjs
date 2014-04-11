describe('npm-registry', function () {
  'use strict';

  var chai = require('chai')
    , expect = chai.expect;

  var Registry = require('../')
    , registry = new Registry();

  //
  // The module name we want to use for testing, it shouldn't matter which
  // package we use but having the option to configure this is nice.
  //
  var module = 'eventemitter3';

  it('exposes an object of mirrors', function () {
    expect(Registry.mirrors).to.be.a('object');
    expect(Object.keys(Registry.mirrors).length).to.be.above(1);
  });

  it('sets authorization information when provided with with user/pass', function () {
    expect(registry.authorization).to.equal(undefined);

    var reg = new Registry({ user: 'foo', password: 'bar' });

    expect(reg.authorization).to.not.equal(undefined);
    expect(reg.authorization).to.be.a('string');
  });

  it('defaults to Nodejitsu\'s replica', function () {
    expect(registry.api).to.equal(Registry.mirrors.nodejitsu);
  });

  it('has a customizable registry', function () {
    var reg = new Registry({ registry: Registry.mirrors.strongloop });
    expect(reg.api).to.equal(Registry.mirrors.strongloop);
  });

  it('sets api mirrors by default', function () {
    var mirrors = Object.keys(Registry.mirrors);

    expect(registry.mirrors).to.be.a('array');
    expect(registry.mirrors.length).to.equal(mirrors.length);

    mirrors.forEach(function (key) {
      expect(registry.mirrors).to.contain(Registry.mirrors[key]);
    });
  });

  describe('.packages', function () {
    it('has a packages endpoint', function () {
      expect(registry.packages).to.be.a('object');
    });

    describe('#get', function () {
      it('retrieves a module by name', function (next) {
        registry.packages.get(module, function (err, data) {
          data = Array.isArray(data) ? data[0] : data;
          if (err) return next(err);

          expect(data.name).to.equal(module);
          next();
        });
      });

      it('does not include extended/upgraded information', function (next) {
        registry.packages.get(module +'@0.0.0', function (err, data) {
          data = Array.isArray(data) ? data[0] : data;
          if (err) return next(err);

          expect(data.name).to.equal(module);
          expect(data.licenses).to.equal(undefined);
          next();
        });
      });

      it('can retreive specifc versions using the @ sign', function (next) {
        registry.packages.get(module +'@0.0.0', function (err, data) {
          data = Array.isArray(data) ? data[0] : data;
          if (err) return next(err);

          expect(data.name).to.equal(module);
          expect(data.version).to.equal('0.0.0');
          next();
        });
      });

      it('can retreive specifc versions using the / sign', function (next) {
        registry.packages.get(module +'/0.0.0', function (err, data) {
          data = Array.isArray(data) ? data[0] : data;
          if (err) return next(err);

          expect(data.name).to.equal(module);
          expect(data.version).to.equal('0.0.0');
          next();
        });
      });
    });

    describe('#details', function () {
      it('includes extended/upgraded information', function (next) {
        registry.packages.details(module, function (err, data) {
          data = Array.isArray(data) ? data[0] : data;
          if (err) return next(err);

          expect(data.licenses).to.be.a('array');
          expect(data.licenses).to.contain('MIT');
          expect(data.name).to.equal(module);

          next();
        });
      });
    });

    describe('#releases', function () {
      it('returns multiple releases as object', function (next) {
        registry.packages.releases(module, function (err, releases) {
          if (err) return next(err);

          var versions = Object.keys(releases);

          expect(releases).to.be.a('object');
          expect(versions.length).to.be.above(3);

          versions.forEach(function (version) {
            if (version === 'latest') return; // Tags are the only exception.

            expect(version).to.equal(releases[version].version);
          });

          next();
        });
      });

      it('correctly merges data from the source package', function (next) {
        registry.packages.releases(module, function (err, releases) {
          if (err) return next(err);

          Object.keys(releases).forEach(function each(version, index, keys) {
            var release = releases[version]
              , future = keys[(index + 1) >= keys.length ? 0 : index + 1]
              , next = releases[future];

            if (future === 'latest' || version === 'latest') return;

            expect(release.version).to.not.equal(next.version);
            expect(release.date).to.not.equal(next.date);

            expect(release.created.toString()).to.equal(next.created.toString());
            expect(release.modified.toString()).to.equal(next.modified.toString());
            expect(release.starred).to.deep.equal(next.starred);
            expect(release.maintainers).to.deep.equal(next.maintainers);
            expect(release.name).to.equal(module);
            expect(next.name).to.equal(module);
          });

          next();
        });
      });
    });
  });
});
