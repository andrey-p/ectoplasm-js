exports.run = function (args, callback) {
  if (args.number && args.exponent) {
    callback(null, Math.pow(args.number, args.exponent));
  } else {
    callback("needs to pass a number and exponent");
  }
};
