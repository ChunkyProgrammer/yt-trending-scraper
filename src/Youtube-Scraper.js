const requester = require("./HashtagRequester")

class YoutubeScraper {

    //starting point
    static async scrape_hashtag_page(parameters) {
        let geoLocation = null
        let tag = parameters.tag
        let httpsAgent = parameters.httpsAgent
        let continuation = parameters.continuation
        if (parameters) {
            if ('geoLocation' in parameters) {
                geoLocation = parameters.geoLocation
            }
        }
        const request_data = await requester.requestHashtagPage({getoLocation: geoLocation, tag: tag, continuation: continuation, httpsAgent: httpsAgent });
        return this.parse_new_html(request_data.data, continuation);
    }

    static parse_new_html(html_data, continuationPassed) {
        // matches the special setup of the video elements
        let jsonContent
        let contentArrayJSON
        let header 
        if (continuationPassed) { // data slightly different when continuation is used
            jsonContent = html_data.onResponseReceivedActions[0].appendContinuationItemsAction
            contentArrayJSON = jsonContent.continuationItems
        } else {
            header = '{' + html_data.match(/"hashtagHeaderRenderer".+?(},"trackingParams)/)[0]
            header = JSON.parse(header.substring(0, header.length -16)+'}}')
            jsonContent = '{' + html_data.match(/"twoColumnBrowseResultsRenderer".+?(},"tab)/)[0]
            jsonContent = JSON.parse(jsonContent.substr(0, jsonContent.length-5) + '}}]}}')
            contentArrayJSON = jsonContent.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents
        }
        let hashtag = ''
        let hashtagVideosText = ""
        let hashtagChannelText = ""
        let hashtagBackgroundColor = null
        let hashtagThumbnails = null
        if (header) {
            hashtag = header.hashtagHeaderRenderer.hashtag.simpleText
            let hashtagInfoText = header.hashtagHeaderRenderer.hashtagInfoText.simpleText.split(' • ')
            hashtagVideosText = hashtagInfoText[0]
            hashtagChannelText = hashtagInfoText[1]
            hashtagBackgroundColor = header.hashtagHeaderRenderer.backgroundColor
            hashtagThumbnails = header.hashtagHeaderRenderer.backgroundImage.thumbnails
        }
        let videos = []
        const current_time = Date.now();
        let continuation = null
        contentArrayJSON.forEach((data,i ) => {
            if ('richItemRenderer' in data) {
                const video = this.parse_normal_video_section(data.richItemRenderer.content, current_time, i)
                videos.push(video)
            } else {               
                continuation = data.continuationItemRenderer.continuationEndpoint.continuationCommand.token
            }
        })
        return {
            hashtag: hashtag,
            hashtagVideosText: hashtagVideosText,
            hashtagChannelText: hashtagChannelText,
            hashtagBackgroundColor: hashtagBackgroundColor,
            hashtagThumbnails: hashtagThumbnails,
            videos: videos, 
            continuation: continuation 
        }
    }

    static parse_normal_video_section(videoRenderer, currentTime) {
            videoRenderer = videoRenderer.videoRenderer
            let video_entry = {
                videoId: -1,
                title: "",
                type: "video",
                author: "",
                authorId: "",
                authorUrl: "",
                videoThumbnails: [],
                description: "",
                viewCount: -1,
                published: -1,
                publishedText: "",
                lengthSeconds: -1,
                liveNow: false,
                paid: false,
                premium: false,
                isUpcoming: false,
                timeText: "",
                isVerified: false,
                isVerifiedArtist: false
            };
            video_entry.videoId = videoRenderer.videoId;
            video_entry.title = videoRenderer.title.runs[0].text;
            video_entry.author = videoRenderer.longBylineText.runs[0].text;
            video_entry.authorId = videoRenderer.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId;
            video_entry.authorUrl = videoRenderer.longBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url;
            video_entry.viewCount = ('viewCountText' in videoRenderer) ? this.calculate_view_count(videoRenderer.viewCountText.simpleText) : 0;
            video_entry.publishedText = videoRenderer.publishedTimeText.simpleText;
            video_entry.published = this.calculate_published(video_entry.publishedText, currentTime);
            video_entry.timeText = videoRenderer.lengthText.simpleText;
            video_entry.lengthSeconds = this.calculate_length_in_seconds(video_entry.timeText);
            video_entry.videoThumbnails = this.extract_thumbnail_data(video_entry.videoId);
            if ('ownerBadges' in videoRenderer) {
                video_entry.isVerified = (videoRenderer.ownerBadges[0].metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED')
                video_entry.isVerifiedArtist = (videoRenderer.ownerBadges[0].metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED_ARTIST')
            }

            //check whether the property is available, because there can be videos without description which won't have an empty property
            if(videoRenderer.hasOwnProperty("descriptionSnippet")){
                video_entry.description = videoRenderer.descriptionSnippet.runs[0].text;
            }
        return video_entry
    }

    //calculates the length of the video in seconds as a number from the string "hh:mm:ss"
    static calculate_length_in_seconds(lengthText){
        let length_seconds = 0;
        const hours_minutes_seconds = lengthText.match(/(\d(\d)*)/g);
        // calculate the time in seconds for every entry
        for(let i = hours_minutes_seconds.length-1; i >= 0; i--){
            length_seconds += Math.pow(60, (hours_minutes_seconds.length - i - 1)) * hours_minutes_seconds[i];
        }
        return length_seconds;
    }

    //calculates the number of views from the corresponding string "xxx,xxx,xxx,xxx"
    static calculate_view_count(viewText){
        let view_count = 0;
        const viewers_three_split = viewText.match(/(\d(\d)*)/g);
        for(let i = 0; i < viewers_three_split.length; i++){
            view_count = view_count * 1000 + Number(viewers_three_split[i]);
        }
        return view_count;
    }

    //calculates the rough timestamp of the release - very exact for minutes, medium exact for hours and loosy exact for days
    static calculate_published(publishText, currentTime){
        const time_published_ago = publishText.match(/(\d(\d)*)/g);
        let time_span;
        if(publishText.indexOf("day") > -1){
            // posted x days ago
            time_span = Number(time_published_ago[0]) * 24 * 360 * 1000;
        }else if(publishText.indexOf("hours") > -1){
            // posted x hours ago
            time_span = Number(time_published_ago[0]) * 360 * 1000;
        }else{
            // posted x minutes ago, just in case
            time_span = Number(time_published_ago[0]) * 60 * 1000;
        }
        return currentTime - time_span;
    }

    //creates a list of dictionaries with the relevant data for the different thumbnails
    //TODO maxres.jpg does not load even tho it loads in invidious
    static extract_thumbnail_data(videoId){
        //TODO: make customizable
        return [
            this.create_thumbnail_dictionary("maxres", `https://i.ytimg.com/vi/${videoId}/maxres.jpg`, 1280, 720),
            this.create_thumbnail_dictionary("maxresdefault", `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, 1280, 720),
            this.create_thumbnail_dictionary("sddefault", `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`, 640, 480),
            this.create_thumbnail_dictionary("high", `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, 480, 360),
            this.create_thumbnail_dictionary("medium", `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, 320, 180),
            this.create_thumbnail_dictionary("default", `https://i.ytimg.com/vi/${videoId}/default.jpg`, 120, 90),
            this.create_thumbnail_dictionary("start", `https://i.ytimg.com/vi/${videoId}/1.jpg`, 120, 90),
            this.create_thumbnail_dictionary("middle", `https://i.ytimg.com/vi/${videoId}/2.jpg`, 120, 90),
            this.create_thumbnail_dictionary("end", `https://i.ytimg.com/vi/${videoId}/3.jpg`, 120, 90),
        ];
    }

    static create_thumbnail_dictionary(Quality, Url, Width, Height){
        return{
            quality: Quality,
            url: Url,
            width: Width,
            height: Height
        };
    }
}
module.exports = YoutubeScraper
