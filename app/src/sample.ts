// Bundled at build time (?raw), so "Try the sample file" needs no fetch.
import sample from '../sample/sample-statement.csv?raw';

export const SAMPLE_NAME = 'sample-statement.csv';
export const SAMPLE_TEXT: string = sample;
