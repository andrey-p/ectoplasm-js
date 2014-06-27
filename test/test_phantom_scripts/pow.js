exports.run = function (args, callback) {
  var result = Math.pow(args.number, args.exponent);

  callback(null, result);
};
