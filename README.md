# YouTube Hashtag Page Scraper NodeJS Documentation
This NodeJS library can scrape all available hashtage pages of YouTube without any API usage. It is developed for and tailored towards easy usage in [FreeTube](https://github.com/FreeTubeApp/FreeTube) but can be used with any other project as well.

Therefore, this library does not require any API keys, with the attached maximum quotas, but instead might take longer to receive the required data.

The library works as long as YouTube keeps its web page layout the same. Therefore, there is **no guarantee** that this library will work at all times.
If this library should not work at some point, please create an issue and let me know so that I can take a look into it. Pull requests are also welcomed in this case.

## Installation
`npm install yt-hashtag-scraper`

## Usage
`const ythash = require("yt-hashtag-scraper")`

## API
**scrape_hashtag_page(_parameters_)**
Returns a list of objects containing all the information of the hashtag page.

The parameters object can contain the following options:

``` 
 tag?:                   String,
 continuation?:         String
 geoLocation?:          String,
```

__tag__ is a required parameter to change the hashtag page you're viewing

__geoLocation__ is an optional parameter to change the country (e.g. JP for Japan) of the trending page. The alpha2 code of the country must be used


__continuation__ is an option parameter to get the next page of the hashtag page you're viewing

### Example usage

```javascript
const parameters = {
    tag: 'shorts'
}

ythash.scrape_hashtag_page(parameters).then((data) =>{
    // console.log(data);
    let continuation = data.continuation
    ythash.scrape_hashtag_page({ continuation: continuation }).then((data2) => {
        console.log(data2)
    })
}).catch((error)=>{
    console.log(error);
});

// data is an object containing the following attributes:
{
    hashtag:                String,
    hashtagVideosText:      String,
    hashtagChannelText:     String,
    hashtagBackgroundColor: Number,
    hashtagThumbnails:      Array[Object],
    videos:                 Array[Object],
    continuation:           String
}

// data2 is an object containing the following attributes:
{
    videos:                 Array[Object],
    continuation:           String
}

// videos is a list of objects containing the following attributes:
{
    videoId:            String,
    title:              String,
    type:               "video",
    author:             String,
    authorId:           String,
    authorUrl:          String,
    videoThumbnails:    Array[Objects],
    description:        String,
    viewCount:          Number,
    published:          Number as timestamp,
    publishedText:      String,
    lengthSeconds:      Number,
    timeText:           String,
    liveNow:            false,
    paid:               false,
    premium:            false,
    isUpcoming:         false,
    isVerified:         Boolean,
    isVerifiedArist:    Boolean
}

// The thumbnail objects:
{
    quality:    "String",
    url:        "String",
    width:      Number,
    height:     Number
}
```
## Credits
Thanks to GilgusMaximus for the yt-trending-scraper module for which this is based on. Thanks to PrestoN for the basic instructions and underlying request code and thanks to ~cadence for the HTML extractor RegEx.
