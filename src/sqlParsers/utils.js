const isEscape = (s) => /(?<escape>\\+)$/.exec(s).groups.escape.length % 2 === 1; 

const blank = (s, options) => {
  let processed = '';
  let count = 0;
  let previous;
  let inString = false;
  let i = 0;
  let stringStart = false;
  let bracketStart = false;
  let open = options?.open || '(';
  let close = options?.close || ')';
  let stringsOnly = options?.stringsOnly;
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
      if (inString) {
        stringStart = true;
      }
    }
    if (char === open && !inString) {
      count++;
      if (count === 1) {
        bracketStart = true;
      }
    }
    if (char === close && !inString) {
      count--;
    }
    if ((!stringsOnly && count > 0) || inString) {
      if (count === 0 && inString && stringStart) {
        processed += char;
        stringStart = false;
      }
      else {
        if (count !== 0 && bracketStart) {
          processed += char;
          bracketStart = false;
        }
        else {
          processed += ' ';
        }
      }
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
