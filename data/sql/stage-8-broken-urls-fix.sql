-- Stage 8 follow-up: replace 14 broken resort website URLs.
--
-- Discovered post-launch when probing every active resort.website_url
-- with HEAD requests (scripts/check-website-urls.mjs). 68 / 441 came
-- back broken; 14 of those were high-confidence (10 ENOTFOUND domain
-- not resolving, 4 hard 404 paths). Each replacement was independently
-- verified by fetching the new URL and confirming it's the right ski
-- area. The remaining 54 were anti-bot timeouts / SSL / 5xx that real
-- users on a real browser will likely succeed at — left alone for now.

UPDATE resorts SET website_url = 'https://skisnowstar.com/'                                            WHERE slug = 'snowstar';
UPDATE resorts SET website_url = 'https://www.skitetonmt.com/'                                        WHERE slug = 'teton-pass';
UPDATE resorts SET website_url = 'https://www.elkocity.com/snobowl/'                                  WHERE slug = 'elko-snobowl';
UPDATE resorts SET website_url = 'http://www.nwwintersportsman.com/BadgerMt/index2.htm'               WHERE slug = 'badger-mountain-wa';
UPDATE resorts SET website_url = 'https://skiechovalley.com/'                                         WHERE slug = 'echo-valley';
UPDATE resorts SET website_url = 'https://www.skilyndon.com/'                                         WHERE slug = 'lyndon-outing-club';
UPDATE resorts SET website_url = 'https://westpoint.armymwr.com/programs/victor-constant-ski-area'    WHERE slug = 'victor-constant-ski-area';
UPDATE resorts SET website_url = 'https://www.mtitasca.com/'                                          WHERE slug = 'mount-itasca';
UPDATE resorts SET website_url = 'https://www.fourlakessnowsports.com/'                               WHERE slug = 'four-lakes';
UPDATE resorts SET website_url = 'https://warnercanyonski.com/'                                       WHERE slug = 'warner-canyon';
UPDATE resorts SET website_url = 'https://www.logecamps.com/journal/glacier-area-guide'               WHERE slug = 'loge-glacier';
UPDATE resorts SET website_url = 'https://www.bvadventures.com/'                                      WHERE slug = 'bear-valley-adventure-company';
UPDATE resorts SET website_url = 'https://payettelakesskiclub.org/pages/bear-basin-nordic-center'     WHERE slug = 'bear-basin-nordic-center';
UPDATE resorts SET website_url = 'https://sapphirevalleyresorts.com/amenities/ski-sapphire-valley/'   WHERE slug = 'sapphire-valley-resort';

-- Verify
SELECT slug, name, website_url
FROM resorts
WHERE slug IN (
  'snowstar','teton-pass','elko-snobowl','badger-mountain-wa','echo-valley',
  'lyndon-outing-club','victor-constant-ski-area','mount-itasca','four-lakes',
  'warner-canyon','loge-glacier','bear-valley-adventure-company',
  'bear-basin-nordic-center','sapphire-valley-resort'
)
ORDER BY slug;
