const isEscape = (s) => /(?<escape>\\+)$/.exec(s).groups.escape.length % 2 === 1; 

const blank = (s, options) => {
  let processed = '';
  let count = 0;
  let previous;
  let inString = false;
  let i = 0;
  let stringsOnly;
  if (options) {
    stringsOnly = options.stringsOnly;
  }
  for (const char of s.split('')) {
    if (char === '\'') {
      if (previous === '\\') {
        if (!isEscape(s.substring(0, i))) {
          inString = !inString;
        }
      }
      else {
        inString = !inString;
      }
    }
    if (char === '(' && !inString) {
      count++;
    }
    if (char === ')' && !inString) {
      count--;
    }
    if ((!stringsOnly && count > 0) || inString) {
      processed += ' ';
    }
    else {
      processed += char;
    }
    previous = char;
    i++;
  }
  return processed;
}

export {
  blank
}
