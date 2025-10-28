const xml2js = require('xml2js');

const parseXmlToJson = (xmlString) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlString, {
      explicitArray: false, // Scalars where possible
      mergeAttrs: true,
      explicitCharkey: true, // Handle CDATA
      charKey: '_', // CDATA in ._
      attrKey: '$'
    }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

module.exports = { parseXmlToJson };