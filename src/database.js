var assign = require('lodash.assign');
var se     = require('shell-escape');

var vagrantSSH = function(dir) {
  return ''
    + '$('
    + 'cd ' + se([dir])
    + ' && '
    + 'vagrant ssh-config'
    + ' | '
    + 'awk \'/HostName /{h=$2}/User /{u=$2}/Port /{p=$2}/IdentityFile /{i=$2}END{print "ssh -p" p " -i" i " " u "@" h}\''
    + ')';
};

module.exports = function(src, dst) {
  src = assign({port: 20}, src);
  dst = assign({port: 20}, dst);

  var sedCommand = 'sed "s|\'' + src.url + '\'|\'' + dst.url + '\'|g"';
  var srcCommand, dstCommand;

  switch (true) {
    case !!src.ssh:
      srcCommand = ''
        + 'ssh'
        + ' -p ' + src.port
        + ' ' + se([src.ssh])
        + ' "wp db export - --path=' + se([src.dir]) + '"';
      break;
    case !!src.vagrant:
      srcCommand = ''
        + vagrantSSH(src.vagrant)
        + ' "wp db export - --path=' + se([src.dir]) + '"'
      break;
    case !!src.sql:
      srcCommand = 'cat ' + se([src.sql]);
      break;
    default:
      throw new Error('Invalid source');
  }

  switch (true) {
    case !!dst.ssh:
      dstCommand = ''
        + 'ssh'
        + ' -p ' + dst.port
        + ' ' + se([dst.ssh])
        + ' "wp db import - --path=' + se([dst.dir]) + '"';
      break;
    case !!dst.vagrant:
      dstCommand = ''
        + vagrantSSH(dst.vagrant)
        + ' "wp db import - --path=' + se([dst.dir]) + '"'
      break;
    case !!dst.sql:
      dstCommand = 'cat > ' + se([dst.sql]);
      break;
    default:
      throw new Error('Invalid destination');
  }

  return srcCommand + ' | ' + sedCommand + ' | ' + dstCommand;
};
