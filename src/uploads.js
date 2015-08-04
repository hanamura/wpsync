var assign = require('lodash.assign');
var se     = require('shell-escape');
var tmp    = require('tmp');
var union  = require('lodash.union');

var vagrantSshUri = function(dir) {
  return ''
    + '$('
    + 'cd ' + se([dir])
    + ' && '
    + 'vagrant ssh-config'
    + ' | '
    + 'awk \'/HostName /{h=$2}/User /{u=$2}END{print u "@" h}\''
    + ')';
};

var vagrantSshOption = function(dir) {
  return ''
    + '$('
    + 'cd ' + se([dir])
    + ' && '
    + 'vagrant ssh-config'
    + ' | '
    + 'awk \'/Port /{p=$2}/IdentityFile /{i=$2}END{print "ssh -p" p " -i" i}\''
    + ')';
};

module.exports = function(src, dst, dryRun, tmpDir) {
  src = assign({port: 22, exclude: []}, src);
  dst = assign({port: 22, exclude: []}, dst);

  var exclude = union(src.exclude, dst.exclude);
  var rsyncSrc, rsyncSrcSsh;
  var rsyncDst, rsyncDstSsh;

  switch (true) {
    case !!src.ssh:
      rsyncSrc = src.ssh + ':' + src.dir + '/wp-content/uploads/';
      rsyncSrcSsh = '"ssh -p' + src.port + '"';
      break;
    case !!src.vagrant:
      rsyncSrc = ''
        + '"'
        + vagrantSshUri(src.vagrant)
        + ':'
        + src.dir + '/wp-content/uploads/'
        + '"';
      rsyncSrcSsh = '"' + vagrantSshOption(src.vagrant) + '"';
      break;
  }

  var preCommand = ''
    + 'rsync'
    + ' -e ' + rsyncSrcSsh
    + ' ' + rsyncSrc
    + ' ' + se([tmpDir])
    + ' -rcv --delete'
    + (exclude ? ' ' + exclude.map(function(x) {
      return '--exclude=' + se([x]);
    }).join(' ') : '');

  switch (true) {
    case !!dst.ssh:
      rsyncDst = dst.ssh + ':' + dst.dir + '/wp-content/uploads/';
      rsyncDstSsh = '"ssh -p' + dst.port + '"';
      break;
    case !!dst.vagrant:
      rsyncDst = ''
        + '"'
        + vagrantSshUri(dst.vagrant)
        + ':'
        + dst.dir + '/wp-content/uploads/'
        + '"';
      rsyncDstSsh = '"' + vagrantSshOption(dst.vagrant) + '"';
      break;
  }

  var postCommand = ''
    + 'rsync'
    + ' -e ' + rsyncDstSsh
    + ' ' + se([tmpDir + '/'])
    + ' ' + rsyncDst
    + ' -rcv --delete'
    + (exclude ? ' ' + exclude.map(function(x) {
      return '--exclude=' + se([x]);
    }).join(' ') : '')
    + (dryRun ? ' --dry-run' : '');

  return preCommand + ' && ' + postCommand;
};
