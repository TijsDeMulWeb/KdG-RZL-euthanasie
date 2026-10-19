import landenLijst from 'i18n-iso-countries';
import nl from 'i18n-iso-countries/langs/nl.json';

landenLijst.registerLocale(nl);

/** Nederlandse korte naam voor een ISO-cijfercode zoals in de kaartdata (bv. '056' wordt 'België'). */
export function landnaam(iso: string, reserve = ''): string {
  const alpha2 = landenLijst.numericToAlpha2(iso);
  const naam = alpha2 ? landenLijst.getName(alpha2, 'nl', { select: 'alias' }) : undefined;
  return naam ?? reserve ?? iso;
}
