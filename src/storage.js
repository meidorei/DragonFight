export function readStored(key,fallback){try{return JSON.parse(localStorage.getItem('dragonfight.'+key))??fallback;}catch{return fallback;}}
export function writeStored(key,value){try{localStorage.setItem('dragonfight.'+key,JSON.stringify(value));return true;}catch{return false;}}
