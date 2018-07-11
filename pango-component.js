const nanopb = require('.');

module.exports = {
    targets: {
        'nanopb-download': new nanopb.NanopbDownloadTarget(),
        'nanopb-extract': new nanopb.NanopbExtractTarget()
    }
};
