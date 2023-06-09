import { Builder, By } from "selenium-webdriver";
import { CrawlerService } from "./crawl";
import {
  appendErrorHotelFile,
  fileLocationList,
  getConfig,
  handleErrorHotelFile,
  showResult,
  writeFileConfig,
} from "../util/helpers";
import { HOTEL_PER_PAGE } from "../util/contant";
import {
  crawlHotelAroundError,
  crawlHotelError,
  forwardHotelUrl,
} from "./hotel";
import { crawlHotelLocation } from "./location";
require("chromedriver");

export const crawHotelPage = async (url: string) => {
  let driver = await new Builder().forBrowser("chrome").build();

  await driver.get(url);

  const pageButtons = await driver.findElements(
    By.css("ol.a8b500abde > li.f32a99c8d1")
  );

  const crawPageService = new CrawlPage({ webdriver: driver });

  const lastPageNumber = +(
    (await pageButtons
      .at(-1)
      ?.findElement(By.css("button.fc63351294.f9c5690c58"))
      ?.getText?.()) || 0
  );

  console.log("Total Page: ", lastPageNumber);

  const config = await getConfig();
  let _currentPage = +(config?.currentPage || "0");

  if (_currentPage === 0) {
    await crawPageService.hotelPageSlice();
    await writeFileConfig({
      ...config,
      currentPage: `1`,
      pageLength: `${lastPageNumber}`,
      url,
    });
    _currentPage = 1;
  }

  for (
    let currentPage = _currentPage;
    currentPage < lastPageNumber;
    currentPage++
  ) {
    console.log("---Current Page---\n", currentPage);
    const _url = `${url}&offset=${currentPage * HOTEL_PER_PAGE}`;
    await writeFileConfig({
      ...config,
      currentPage: `${currentPage}`,
      url: _url,
    });
    await driver.navigate().to(_url);
    await crawPageService.hotelPageSlice();
    if (currentPage === lastPageNumber - 1) {
      await writeFileConfig({
        currentPage: `${0}`,
      });
    }
  }

  driver.quit();
};

class CrawlPage extends CrawlerService {
  async hotelPageSlice() {
    const hrefList = await this.hotelList();

    const ITEM_SLICE_NUMBER = 10;
    const total = hrefList.length / ITEM_SLICE_NUMBER;

    for (let page = 0; page < total; page++) {
      const start = ITEM_SLICE_NUMBER * page;
      const end = start + ITEM_SLICE_NUMBER;

      await Promise.all(
        hrefList.slice(start, end).map((item) => {
          return forwardHotelUrl(item, {
            onFail: async (error, href) => {
              await appendErrorHotelFile({ url: href, reason: error.name });
            },
          });
        })
      );
    }

    await crawlHotelError();
    await handleErrorHotelFile();

    await showResult();
    return true;
  }
}

export const craw = async () => {
  let locations = await fileLocationList();
  if (!locations?.length) {
    locations = await crawlHotelLocation();
  }

  const url = locations[0];

  const config = await getConfig();

  const HOTEL_STAR = 5;
  for (let index = config.star; index <= HOTEL_STAR; index++) {
    console.log(`__BEGIN CRAWL ${index} STAR`);

    await crawHotelPage(`${url}&nflt=class%3D${index}`);
    await writeFileConfig({
      star: index,
    });
    console.log(`__FINISH CRAWL ${index} STAR`);
  }

  await crawlHotelAroundError();
  await crawlHotelError();
};
