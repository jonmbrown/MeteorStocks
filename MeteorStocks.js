//
// MeteorStocks.js
//
// Jon Brown - Nov / Dec 2014
//
// My first full Meteor app.
//
// Gets current stock information via async calls to AlphaVantage (was Yahoo until Nov 2017).
//
// Uses Bootstrap for UI. Integrates with Cordova to use vibration, GPS and camera.
//
// For Vibration:       $ meteor add cordova:org.apache.cordova.vibration@0.3.12    (NOTICE :)
// For GPS:             $ meteor add cordova:org.apache.cordova.geolocation@0.3.11  (NOTICE :)
// For Camera           $ meteor add cordova:org.apache.cordova.camera@0.3.4        (NOTICE :)
//
// To install and run:  $ meteor run android-device -p 4000 --mobile-server 220.237.122.201:4000
// Just to run:         $ meteor --port 4000
//
// Used packages:       $ meteor list
//
//                      Cheerio                                 0.3.2   jQuery for HTML parsing - $meteor add mrt:cheerio
//                      iron-router                             1.0.7   Enables multiple pages eg About etc
//                      cordova:org.apache.cordova.vibration    0.3.12
//                      cordova:org.apache.cordova.geolocation  0.3.11
//                      cordova:org.apache.cordova.camera       0.3.4
//                      http                                    1.0.8   Make HTTP calls to remote servers
//                      insecure                                1.0.1   Allow all database writes by def...
//                      meteor-platform                         1.2.0   Include a standard set of Meteor...
//                      mizzao:bootstrap-3                      3.3.1_1 HTML, CSS, and JS framework fo...
//
// Bootstrap glyphicons are detailed here: http://getbootstrap.com/components/
//
// ** IDEAS **   Lookup analyst recommendations (eg https://au.finance.yahoo.com/q/ao?s=CSL.AX). Parse for tabledata1 to get values
//
//  FUTURES??  - Somehow work out how to pass error values back up the call tree - it's a real pain-in-the-aaa
//
// 12 Nov 2020 - Created an IEX Cloud account *** BUT NOT CURRENTLY USING THIS ***
//               50,000 free calls per month, resetting on the first of every month at 00:00:00 UTC
//               https://iexcloud.io/console/ and https://iexcloud.io/docs/api/#rest-how-to
//               API PRODUCTION Token is in Gmail. If used in code make sure that you DO NOT PUBLISH TO GITHUB!
//               For example:
//               https://cloud.iexapis.com/stable/stock/DOCU/quote?token=<TOKEN>&filter=symbol,latestPrice,change
//               Returns:
//               {"symbol":"DOCU","latestPrice":198.31,"change":0.71}
//               Which can be converted into a Javascript object like this:
//                  var txt = '{"symbol":"DOCU","latestPrice":198.31,"change":0.71}';
//                  var obj = JSON.parse(txt);
//               then the values referred to like this:
//                  obj.symbol + ", " + obj.latestPrice + ", " + obj.change;
//
//               *** BUT: Data on the S&P 500, Dow Jones Industrial Average, and other major stock indices is not
//                        currently available on IEX Cloud and is unlikely to be in the future as it costs too much.
//                        An alternative is to display ETFs that match those indices, such as SPY for the S&P 500 and
//                        DIA for Dow Jones.... hmmm, maybe not...
//
// 11 Nov 2020 - FreeStockCharts stopped working so switched to Bigcharts instead (part of MarketWatch)
//               For example https://bigcharts.marketwatch.com/quotes/multi.asp?refresh=on&view=Q&msymb=docu
//
//  5 Nov 2020 - Added ability to only show home (ASX) stocks in heatmap and stocks list and fixed some CSS issues - finally!
//
//  2 Sep 2019 - Added onlyDivs functionality to only show stocks with Dividends
//
// 15 Feb 2019 - Used this insane regex to insert commas in 1000's (eg Dow and Nasdaq) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//
// 15 Feb 2019 - Now using http://www.freestockcharts.com/Company/ as AV no longer seems to return Nasdaq index - lawsuite? and FSC does not
//               seem to have the usage restrictions either. It uses these terms for the main indices:
//               DJI.US => DJ-30, SPX.US => SP-500, IXIC.US => COMPQX (Nasdaq)
//
// 10 Sep 2018 - Updated XJO chart to use https://au.advfn.com. Also now checks there is a CordovaImage tag in the HTML before trying to set it :-)
//               Updated to include Dow and Nasdaq charts and also tiny charts accessed from the heatmap.
//
//  6 Sep 2018 - Restructured getStock and callback code to make it easier to use different data sources for AU and none-AU stocks
//               Switched back to using AV for none-AU stocks. Works fine so long as only a few.
//
//  2 Aug 2018 - Switched out AlphaVantage as it caps at 5 calls in a minute - now using new ASX JSON service - but it does not provide
//               data from other exchanges - can keep AV for that perhaps.
//
// 24 Mar 2018 - For larger value stocks (eg Dow Jones) it's ugly in the heatmap to show huge price including cents so only showing dollars if > $1000
//               Commented out getStockNews to emphasise that it's never called.
//
// 20 Nov 2017 - Added code to lookup UV index (currently for Melbourne). Writes the data to the server but need to add to DB so can be written to
//               the client. Currently using the GPS icon on the client to refresh this - need a new icon probably but OK for now as
//               GPS does not work unless a cordova app which I'm not doing at the moment (ie only a web app these days)
//               glyphicon glyphicon-sunglasses might be a good icon to use (see https://www.w3schools.com/bootstrap/bootstrap_ref_comp_glyphs.asp)
//
//  8 Nov 2017 - Now using AlphaVantage as Verizon killed off Yahoo's stock service in Nov 2017. Meteor 1.6. Heroku.
//               AV API Key is XU3WHYK1ZHZFZICM
//               Enter an index by following with .US eg SPX.US or DJI.US
//               Unfortunately, AV API does not return the ticker name for indexes so needed to hardcode logic around Dow, S&P and Nasdaq - ugh!
//               Added a sleep of 500ms in the server to ensure we don't smash the API when updating all stocks.
//               Added a .meteorignore file to stop the problem of backups/files.js being compiled too. Spotted that this
//               was happening with a weird Stocks Collection already exists. Even better is to rename files in backups as .old
//
// 22 Jul 2017 - Removed the unblocks (search for !!!) to try and fix the mismatch when updating values. Weird...
//
// 11 May 2017 - STOPPING NEWS FOR NOW UNTIL I FIND A WORKAROUND FOR THE JAVASCRIPT OBFUSCATION BY THE ASX - INTRODUCED TO STOP SCRAPING!
//
// 10 May 2017 - Used a fixed url (Furl) to create a new url each time as code had an overflow problem (not clearing out previous url).
//               Still has not fixed the issue. Pressing refresh seems to cycle through the correct and wrong values. No idea why?!
//
//  3 May 2017 - Implemented the new style Yahoo call (see notes for 1 May) using JSON rather than CSV.
//
//  1 May 2017 - Added more debugging information as previous URL looks to have been killed off by Yahoo (returns 'redirect')
//               May have to use and parse this instead (maybe wait a week to see if it comes back):
//               Test to see by visiting http://finance.yahoo.com/webservice/v1/symbols/IBM/quote?format=csv
//               https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D%27http%3A%2F%2Fdownload.finance.yahoo.com%2F
//               d%2Fquotes.csv%3Fs%3DAWC.AX%26f%3Dsl1c1p2%27&format=json&env=store%3A%2F%2Fdatatables.org%2F
//               (see https://developer.yahoo.com/yql/ - Can string many together and it may be worth doing that to reduce calls)
//               Sample response: (Returned data is ~153 bytes compared to 32 bytes previously)
//               {"query":{"count":1,"created":"2017-05-01T04:54:07Z","lang":"en-US","results":{"row":{"col0":"AWC.AX","col1":"1.815","col2":"-0.025","col3":"-1.359%"}}}}
//               Notice result is JSON not CSV so may actually be easier to parse, eg
//               x = content.query.results.row.col0; // Returns the stock code, AWC.AX
//
//               Easily test the code using https://www.w3schools.com/js/tryit.asp?filename=tryjson_object_access2
//               This site is handy for JSON parsing: http://json.parser.online.fr/
//
//  5 Apr 2017 - Changed so Debug message is always shown
//		         Upgraded to Meteor version 1.4.3.2
//               Needed to do $meteor npm install --save babel-runtime
//               Also changed the buildpack to:
// cf push CDNA -m 160M -b https://github.com/AdmitHub/meteor-buildpack-horse
//
// 29 Aug 2016 - Changed heatmap and heatmap news to show share values (last) to 2 decimal places
//               Change colour (to indigo) if stock is not Australian - eg UK BLT, RIO or S32 should be easy to see are not the .AX ones
//
// 18 Aug 2016 - Upgraded to use new Dividends source webpage format:
// https://www.asb.co.nz/tools/securitiesfeeds/Research/UpcomingDividends
//
//  7 Nov 2015 - Upgraded to work with latest Meteor, new Android SDK etc
//
//  4 May 2015 - Removed CreatedAt (it was unused at slows down load time). Used ticker as _id to save space and speed load time
//               Added a flag next to the stock if there's a news item - clicking it takes you to news. Used to just show a *
//
//  5 Mar 2015 - Added this.unblock() for getDividends, getStocks and getStockNews - zoom! Goes from ~25 seconds to 2 seconds
//               More detailed button version of the heatmap on the News page
//               Moved debug option to bottom of screen and defaulted it to Off
//
//  4 Mar 2015 - Added Debug feature and awesome Callback from Meteor.Call
//
// 27 Feb 2015 - Set news to "" for newly added stock
//
// 24 Feb 2015 - News page showing heatmap and text of any price sensitive news
//
// 23 Feb 2015 - Added price sensitive news items from ASX.com.au - uses Cheerio jQuery package
//               Improved Mongo code by writing only changed parts of records - not whole record
//
// 20 Feb 2015 - Vibrate on delete and shorter greet message for Google Maps
//
// 19 Feb 2015 - Added GoogleMaps static image. Refresh now also forgets GPS position and camera image
//
// 18 Feb 2015 - Tidied up display of dividends (now $/share, not c/share). Searches for dividends if new stock added
//
// 18 Feb 2015 - Uses Iron Router now :-) Included About, Help and Services pages
//
// 17 Feb 2015 - Added a busy indicator that runs on startup. Also moved code inside startup()
//
// 11 Feb 2015 - Added indexes support. But cannot get ^DJI to work as per website. I suspect Yahoo traps this one....!
//               Tried to add a busy indicator to display while server content is loading but no luck. Where is the delay?
//
// 10 Feb 2015 - Added GPS 3 second timeout. Any GPS timeout or error now says GPS position not found
//               Added latest Greet debug message to very bottom of client window
//               Larger (90% width rather than 50%) embedded graphs
//
//  7 Feb 2015 - Dividends search only for Australian stocks (and without the .AX)
//               Heatmap reflects if the stock goes XD or dividend is paid today
//               Adds a refresh timestamp to trick embedded page images to reload (ie not cache)
//
// 16 Jan 2015 - Added Tooltips to Heatmap (could not get Bootstrap ones working due - probably - to CSS conflicts
//               Trapping N/A returned by Yahoo if stock is not valid)
//               Added support for non Australian stocks - add .US for US stocks for example eg IBM.US
//               Much better error checking of input stock code - try and break it!
//
// 14 Jan 2015 - Added Heatmap capability (with font-size=1px workaround)
//
// 23 Dec 2014 - Added Yahoo Dow Jones chart and scaled charts to 50% width
//
// 22 Dec 2014 - Added sorting by 2 columns and stopped storing the + in positve changes
//               added parseFloat() to ensure Mongo stores last, chg and % change as numbers (not strings) for correct sorting
//
// 18 Dec 2014 - Added dividend information

// These functions are available on both the client and the server ===========================

var greet = function(text) {
    console.log(text);
    if(Meteor.isClient) {
        Session.set("S-Greet", text); // Always show DEBUG status message
//        if (Session.equals("S-Debug", true)) Session.set("S-Greet", text); // If Debug is on, show status message
    }
}

var isToday = function(date) { // Utility function to see if passed date (dd Mmm) is the same as today
    var d = new Date();
    var t = d.toString();
    var mmm = t.substring(4,7); // Month
    var dd = t.substring(8,10); // Day
    var today = dd + " " + mmm;
    if (date == today) return true;
    return false;
}
    
Stocks = new Mongo.Collection("Stocks");
    
if (Meteor.isCordova) {
  greet(">>> Meteor Cordova is alive");
}

// Everything in here is only run on the server ==============================================

if(Meteor.isServer) {
    greet(">>> Meteor Stocks server is alive");

  Meteor.publish("stocks", function () {
    return Stocks.find();
  });

  Meteor.methods({

    getUV: function(city) {
/**************************************
SERVER METHOD
Gets the UV data for a city and writes the value - in the range 0-12

Sample data:

<stations>
<location id="Adelaide">
<name>adl</name>
<index>10.3</index>
<time>12:39 PM</time>
<date>20/11/2017</date>
<fulldate>Monday, 20 November 2017</fulldate>
<utcdatetime>2017/11/20 11:39</utcdatetime>
<status>ok</status>
</location>
<location id="Alice Springs">
.....
</location>
</stations>


**************************************/

      var UVurl = 'https://uvdata.arpansa.gov.au/xml/uvvalues.xml';
//    greet("Finding UV for "+city);

      HTTP.call("GET", UVurl, function (error, result) {
//      Callback function:
        if (error)
        {
            greet("Error getting UV data:" + error.message);
            return "<error>";
        }

//      greet("Found (" + result.content.length + " bytes):" + result.content);
// greet("Found:" + result.content.length + " bytes");
//
// NOTE: CALLBACK DOES NOT KNOW THE CITY SO DEFAULTING TO MELBOURNE FOR NOW
//
        if (result.content.length < 1000) // Normal returns are around 4K
        {
            greet("ERR1:" + stock + " returned strange result getting UV data");
            greet("ERR2:" + stock + " length:" + result.content.length + " bytes");
            greet("ERR3:" + stock + " content:" + result.content);
            return "<confused>"; // Would be nice to pass back error message from callback to client but cannot see how to
        }

        var UVdata = result.content; // XML format
        var UVlocation = UVdata.split("location id="); // Array of locations
//        greet("Header data:"+UVlocation[0]);
//        greet("Melbourne data:"+UVlocation[11]); // Melbourne is the 11th
        /* Returns something like this...
        <name>mel</name>
        <index>8.4</index>
        <time>1:42 PM</time>
        <date>20/11/2017</date>
        <fulldate>Monday, 20 November 2017</fulldate>
        <utcdatetime>2017/11/20 12:42</utcdatetime>
        <status>ok</status>
        </location>
        *********/
        var UVdetails = UVlocation[11].split(">"); // Melbourne data
//      0:"Melbourne"
//      1:<name
//      2:mel</name
//      3:<index
//      4:0:8.1</index
//      5:<time
//      6:2:06 PM</time
//      7:<date
//      8:20/11/2017</date
//        greet("Part2:"+UVdetails[2]);
//        greet("Part4:"+UVdetails[4]);
//        greet("Part6:"+UVdetails[6]);
//        greet("Part8:"+UVdetails[8]);
        var UVlatest = UVdetails[4].split("<")[0];
        var UVtime   = UVdetails[6].split("<")[0];
        var UVlevel = "Low";                       // Green
        if (UVlatest >=  3) UVlevel = "Moderate";  // Yellow
        if (UVlatest >=  6) UVlevel = "High";      // Orange
        if (UVlatest >=  8) UVlevel = "Very High"; // Red
        if (UVlatest >= 11) UVlevel = "Extreme";   // Purple
        greet("UV at "+UVtime+ " was "+UVlatest+" ("+UVlevel+")");

// TO DO: Need to write the UV value to the DB and add code so that it appears on the client
      }); // Callback
      return city;
    }, //getUV

/*////////////////////////////////////////////////////////////////////////////////////////
//
// Updates or creates a stock. On entry id=0 if new or, for example, GNC.AX if it exists
//
// Called from getStock via a meteor.call as this too is a server function
//
////////////////////////////////////////////////////////////////////////////////////////*/

    updateStock: function(stock, id, ticker, last, chg, chgpc) { 

        greet(">>>UPDATE STOCK stock=" + stock + ", id=" + id); 

        if (id == 0) // Told this is a new one
        {
            var exists = Stocks.find({ticker: ticker}, {reactive: false}).fetch(); // Get any matching record
            if (exists[0]) // First entry in the array is the record
            {
                greet(">>> " + ticker + " already exists"); // So it was not really new
                id = exists[0]._id; // so use it instead
            }
        }
        
        if (id == 0)
        { // New item
            greet(">>> " + ticker +" Created");
            Stocks.insert({
              _id : ticker ,
              ticker: ticker, last: parseFloat(last), chg: parseFloat(chg), chgpc: parseFloat(chgpc),
              XDiv: "", Paid: "", Franked: "", Percent: "", News: ""
//              , createdAt: new Date() // current time
            });
        } else // Update existing item
        {
            greet(">>> " + ticker +" updated");
//          greet("(dividend is " + rec.XDiv + "," + rec.Paid + "," + rec.Franked + "," + rec.Percent + ")");

            Stocks.update(id,{
              $set: { last: parseFloat(last), chg: parseFloat(chg), chgpc: parseFloat(chgpc)
//                    , createdAt: new Date() // current time
              }
            });        
        }
    }, // updateStock

/*///////////////////////////////////////////////////////////////////////////////

Simplified getStock so can call different data sources for AU and none-AU stocks

///////////////////////////////////////////////////////////////////////////////*/

    getStock: function(stock, id) { // Uses ASX JSON API call (Australian stocks only)
//    SERVER METHOD
//    Wait in this server call so we don't smash the API calls too much
      Meteor._sleepForMs(100);

/**************************************

ASX example:

Found at Whirlpool (https://forums.whirlpool.net.au/archive/2678938).

Real-time ASX indices: https://www.asx.com.au/asx/statistics/indexInfo.do

https://www.asx.com.au/asx/1/share/ANZ

Example response:

{"code":"ANZ","isin_code":"AU000000ANZ3","desc_full":"Ordinary Fully Paid","last_price":28.91,"open_price":29.2,"day_high_price":29.21,"day_low_price":28.85,"change_price":-0.16,"change_in_percent":"-0.55%","volume":4133896,"bid_price":28.9,"offer_price":28.91,"previous_close_price":29.07,"previous_day_percentage_change":"-0.785%","year_high_price":30.8,"last_trade_date":"2018-08-02T00:00:00+1000","year_high_date":"2017-10-25T00:00:00+1100","year_low_price":26.075,"year_low_date":"2018-06-14T00:00:00+1000","year_open_price":32.02,"year_open_date":"2014-02-25T11:00:00+1100","year_change_price":-3.11,"year_change_in_percentage":"-9.713%","pe":12.42,"eps":2.341,"average_daily_volume":5477870,"annual_dividend_yield":5.5,"market_cap":-1,"number_of_shares":2885046270,"deprecated_market_cap":83925996000,"deprecated_number_of_shares":2885046270,"suspended":false}

Example error response:
{"error_code":"id-or-code-invalid","error_desc":"The security id or code is invalid - AN"}

**************************************/

      if (stock.indexOf('^') == 0) // If it's an index then deal with it... 
      {
//      Don't need to do anything special anymore with ASX. With Yahoo indexes were special (ie ^ character)
      } else // It's an actual stock
      {
        stock = stock.replace(/[^A-Za-z0-9\.]/g, ''); // Allow only letters, numbers and dot in input (but see *+* above)
 //       greet("Now stock:" + stock);

        if (stock.indexOf('.') < 0)
        {
            stock += '.AX'; // Make this an Australian stock if no exchange is provided ie no .XX. So IBM needs to be IBM.US for example
        }
        if (stock.indexOf('.') == 0) // After removing garbage the input may be nothing so will be .AX by now
        {
          greet("\nNo valid input for ASX");
          return "<unknown>";
        }
      }
      var dotpos = stock.indexOf(".AX");
      if (dotpos < 0) 
      {
//      We call another method if not an Australian stock - only really works with US stocks at the moment
        greet(">>> Stock " + stock + " is not Australian so trying FSC");
// Older methods are commented out but kept here (and the methods are deleted) for history purposes. The deleted methods
// are available in older backups of this code.       
// Was  Meteor.call('getAVStock', stock, id); // until 15 Feb 2019 - Issue is that we don't know if it worked... have tried passing back via try/throw/catch but no luck
// Was  Meteor.call('getFSCStock', stock, id); // until 11 Nov 2020 - But we don't know if it worked...
        Meteor.call('getBigChartsStock', stock, id); // We still don't know if it worked...
        return stock+" processed via BigCharts";
      }

      var Furl = 'https://www.asx.com.au/asx/1/share/';
      var url = Furl + stock.substring(0,dotpos); // Adds stock (minus the .AX index)

      greet("Finding Australian stock via "+url);

//    Need to decide what URL to call based on if the stock if Australian or not

      HTTP.call("GET", url, function (error, result) {
//      Callback function:
        if (error)
        {
            greet("Error ASXing:" + error.message);
            return "<error>";
        }

// greet("Found (" + result.content.length + " bytes):" + result.content);
// greet("Found:" + result.content.length + " bytes");

        if (result.content.length < 500) // Normal returns are around 900 bytes
        {
            greet("ERR1:" + stock + " returned strange result from ASX");
            greet("ERR2:" + stock + " length:" + result.content.length + " bytes");
            greet("ERR3:" + stock + " content:" + result.content);
            return "<confused>"; // Would be nice to pass back error message from callback to client but cannot see how to
        }
 //       greet("ASX:" + stock + " length:" + result.content.length + " bytes");
        var content = JSON.parse(result.content); // ASX uses JSON

        var ticker = content["code"];
        if (ticker) {
            greet ("ASX: Found:"+ticker);
        }
        else {
            greet ("ASX: ERROR - NO TICKER FOUND");
            return;
        }
        ticker += ".AX"; // Needs to include the index, always .AX for ASX
        var last  = content["last_price"];
        var close = content["previous_close_price"];
        var chg = (last-close).toFixed(2);              // With ASX API can get these from the returned
        var chgpc = (chg * 100 / close).toFixed(2);     // data but sticking with calculating it myself
//greet("ASX: Last: $"+last+" Close: $"+ close);
//greet("ASX: Change: $"+chg+" ("+ chgpc + "%)");
    
        greet(stock + " values: [" + ticker + "] [" + last + "] [" + chg + "] [" + chgpc + "]");
                    
//        greet("**** At " + stock + ",id is:" + id);
        greet("**** Calling updateStock");

        Meteor.call('updateStock', stock, id, ticker, last, chg, chgpc); // Issue is that we don't know if it worked...

      }); // Callback
      return stock;
    }, //getStock

///////////////////////////////////////////////////////////////////////////////////
//
//  https://bigcharts.marketwatch.com/quotes/multi.asp?refresh=on&view=Q&msymb=docu
//  
//  "Real-time last sale data for U.S. stock quotes reflect trades reported through Nasdaq only"
// - which is the same as MarketWatch.
//
//  15K file returned has this format (could request many at a time perhaps?):
//
//  <td class="symb-col">DOCU</td>
//  <td class="last-col">198.31</td>
//  <td class="change-col important positive">
//  <img class="net-change" src="/content/v0022/images/icons/arrow_up_sm.gif" />&nbsp;+0.71</td>
//
//  An invalid stock request returns this (but code doesn't check for it yet):
//  <div class="not-found">
//  <span class="label">No symbol found: </span>
//  <span>invalid</span>
//
///////////////////////////////////////////////////////////////////////////////////

    getBigChartsStock: function(stock, id) {
//    SERVER METHOD
//    Wait in this server call so we don't smash the API calls
      Meteor._sleepForMs(500);
//    See https://blog.meteor.com/fun-with-meteor-methods-a0368ee0974c for detail on sleeping and unblock etc
//!!!   this.unblock(); //!!! Need to keep this so we don't smash the API

      var Furl = 'https://bigcharts.marketwatch.com/quotes/multi.asp?refresh=on&view=Q&msymb=';

      var url = Furl;

//    If it's a US stock or index, we don't pass the .US to the API call

      var dotpos = stock.indexOf(".US"); // eg DOCU.US or IXIC.US
      if (dotpos > 0)
      {
        greet("BigCharts:US stock found");
      } else {
        greet("BigCharts:Non-US stock found - should not happen");
        return stock; // Get out of here as only for US stocks
      }
      var lookup = stock.substring(0,dotpos);
      // BigCharts uses these codes for Dow, S&P500 and Nasdaq: DJIA, SPX and COMP
      if (stock.indexOf("IXIC.US") == 0) lookup = "COMP"; // Special case for Nasdaq index (keeping old IXIC code in the DB as it's the usual name)
      if (stock.indexOf("DJI.US") == 0)  lookup = "DJIA";
      if (stock.indexOf("SPX.US") == 0)  lookup = "SPX";

      url += lookup;
      greet("Finding stock via " + url);

      HTTP.call("GET", url, function (error, result) {
//      Callback function:
        if (error)
        {
            greet("Error calling BigCharts:" + error.message);
            return "<error>";
        }

// greet("Found (" + result.content.length + " bytes):" + result.content);
// greet("Found:" + result.content.length + " bytes");

        if (result.content.length < 15000) // Normal returns are around 15Kb (Yahoo was ~150 bytes!)
        {
            greet("ERR1:" + stock + " returned strange result from BigCharts");
            greet("ERR2:" + stock + " length:" + result.content.length + " bytes");
            greet("ERR3:" + stock + " content:" + result.content);
            return "<confused>"; // Would be nice to pass back error message from callback to client but cannot see how to
        }

// For US stocks and indices...
//  <td class="symb-col">DOCU</td>
//  <td class="last-col">198.31</td>
//  <td class="change-col important positive">
//  <img class="net-change" src="/content/v0022/images/icons/arrow_up_sm.gif" />&nbsp;+0.71</td>

//      Get only the last price and the change. Everything is calculated from these two
        greet("Callback for stock:" + stock);

//      First search for the latest price...
        var pStart = result.content.search("td class=\"last-col");
        if (pStart < 0) {
            greet("BigCharts parsing failed");
            return stock; // Failed somehow
        } else
        {
//            greet("Last:Found pStart:" + pStart);
        }
        pStart +=20; // Skip past found tag
        var pNext = result.content.substring(pStart).search("<");
//        greet("Found pNext:" + pNext);            
        if (pNext < 0) return stock; // Failed somehow
        var last = result.content.substring(pStart,pStart+pNext);
        greet("Found last:[" + last + "]");

//      Now continue from where we left off to find the change in price...
        var pStart2 = result.content.substring(pStart).search("/>&nbsp;");
        if (pStart2 < 0) return stock; // Failed somehow
//        greet("Found pStart2:" + pStart2);
        pStart2 = pStart2 + 8; // Skip over nbsp;
        pNext = result.content.substring(pStart + pStart2).search("<");
//        greet("Found pNext:" + pNext);
        if (pNext < 0) return stock; // Failed somehow
        var chg = result.content.substring(pStart+pStart2,pStart+pStart2+pNext);
        greet("Found chg:[" + chg + "]");

//      Tidy up the last price and change and calculate the close price and percentage change

        last = last.replace(/,/g, ""); // No commas in numbers
        chg  = chg.replace(/,/g, "");  // No commas in numbers

        var close = last - chg;
        greet("Created close:[" + close + "]");

        var chgpc = (chg * 100 / close).toFixed(2);
        greet("Created chg %:[" + chgpc + "]");

        var ticker = stock; // eg DOCU.US

        greet(stock + " values: [" + ticker + "] [" + last + "] [" + chg + "] [" + chgpc + "]");
        greet("**** Calling updateStock from getBigChartsStock");
        Meteor.call('updateStock', stock, id, ticker, last, chg, chgpc); // Issue is that we don't know if it worked...
      }); // Callback
      return stock;
    }, //getBigChartsStock

///////////////////////////////////////////////////////////////////////////////////

    getDividends: function(){
//    SERVER METHOD
//!!!      this.unblock();
      var url = 'https://www.asb.co.nz/tools/securitiesfeeds/Research/UpcomingDividends';
/*    Example format (Aug 2016)
<td data-col-title="Code"><a class="stock-link" href="#" onclick="Research.SendStockDetailsToParent('RKN', 'ASX')">RKN</a></td>
<td data-col-title="Exchange">ASX</td>
<td data-col-title="Company Name">Reckon</td>
<td data-col-title="Ex Dividend Date">16 Aug, 16</td>
<td data-col-title="Dividend Pay Date">02 Sep, 16</td>
<td data-col-title="Amount">2.00</td>
<td data-col-title="Franking">0.00%</td>
*/
      greet("Refreshing dividends");
      var result = HTTP.call("GET", url);
      
      var toRefresh = Stocks.find({}, {reactive: false}).fetch();
      
      var dCount = 0;
      
      for (var i in toRefresh)
      {
        var sStock = toRefresh[i].ticker;
              //greet("Doing " + sStock + " = " + i);
        var content = result.content;
        
//      We only lookup dividends for Australian stocks....

        var pstart;

        var aussie = sStock.indexOf(".AX");
        
        if (aussie < 0) {
            greet("Skipping dividend search for " + sStock);
            pStart = 0;
        }
        else
        {
            var to_find = sStock.substr(0,aussie);
//            greet("Finding dividend for " + to_find + " (" + sStock + ")");
            pStart = content.search("'" + to_find + "', 'ASX'");
	    // Now includes "=" before ticker search to stop false
	    // positives on, for example YTMLLC for LLC - April 2016
        }
      
        if (pStart > 0)
        {
          dCount++; // We have one with a dividend
 //         greet("Dividend decoding for " + sStock);
          
          var pXDiv = content.substring(pStart).search("Ex Dividend Date")+18;
          var pPaid = content.substring(pStart+pXDiv).search("Dividend Pay Date")+19;
          var pFrank = content.substring(pStart+pXDiv+pPaid).search("Amount")+8;
          var pFrankE= content.substring(pStart+pXDiv+pPaid+pFrank).search("<");
          var pPC = content.substring(pStart+pXDiv+pPaid+pFrank+pFrankE).search("Franking")+10;
          var pPCE= content.substring(pStart+pXDiv+pPaid+pFrank+pFrankE+pPC).search("<");
          
          var strXDiv = content.substring(pStart+pXDiv,pStart+pXDiv+6); // Use +10 if you want , YY too
          var strPaid = content.substring(pStart+pXDiv+pPaid,pStart+pXDiv+pPaid+6); // Use +10 if you want , YY too
          var Franked = content.substring(pStart+pXDiv+pPaid+pFrank,pStart+pXDiv+pPaid+pFrank+pFrankE);
          var Percent = content.substring(pStart+pXDiv+pPaid+pFrank+pFrankE+pPC,pStart+pXDiv+pPaid+pFrank+pFrankE+pPC+pPCE);
          greet(sStock + " dividend: [" + strXDiv + "] [" + strPaid + "] [" + Franked + "] [" + Percent + "]");
          
          var f = parseFloat(Franked); // No trailing 0s in franked amount. Eg 30.00 -> 30
          f = f / 100;                 // Prefer to store as dollars/share not cents per share
          f = f.toFixed(2);
          Franked = f.toString();
    
          Percent = parseInt(Percent);  // Whole percentages only ie 100.00% -> 100
          
 //         greet("ticker:" + toRefresh[i].ticker);

          Stocks.update(toRefresh[i]._id, {
              $set: { XDiv: strXDiv, Paid: strPaid, Franked: Franked, Percent: Percent // Store dividend information
//                      , createdAt: new Date() // current time
                    }
          }); 
        }
        else
        {
//        greet("Did not find anything - or it's not Australian so we didn't look");      
          Stocks.update(toRefresh[i]._id, {
              $set: { XDiv: "", Paid: "", Franked: "", Percent: "" // Wipe any existing dividend that is no longer relevant
//                      , createdAt: new Date() // current time
                    }
            }); 
        }
      }
      return dCount;
    }, // getDividends

/*  Price sensitive details from:

    http://www.asx.com.au/asx/statistics/announcements.do?by=asxCode&asxCode=&timeframe=R&dateReleased=22%2F12%2F2014 (date in DD/MM/CCYY)
 or http://www.asx.com.au/asx/statistics/announcements.do?by=asxCode&asxCode=LLC&timeframe=D&period=T (for todays)

    Returned HTML snippet:

    <tr class="altrow">
    <td>NXM</td>
    <td>12:38 PM</td>
    <td class="pricesens"><img src="/images/asterix.gif" class="pricesens" alt="asterix" title="price sensitive"></td>
    <td>Triumph Gold Project Update</td>

    Logic is: Find img with asterix.gif, then the parent, then next tag is the news <td>

    Still to do is to mark the heatmap to reflect the presence of sensitive news - maybe add a News page
*/


/*  =========== [START] getStockNews is never called ============================

    getStockNews: function(ticker, id) { // Looks up price sensitive news - Need Cheerio ie $meteor add mrt:cheerio
//    SERVER METHOD
//!!!        this.unblock();
        greet("Finding news for " + ticker + " id=" + id);
        var aussie = ticker.indexOf(".AX");
        if (aussie < 0) {
            greet("Skipping news search for non-Australian " + ticker);
            return ticker + " (ignored)";
        }
        var stock = ticker.substr(0,aussie);
        greet("Finding news for " + stock);
        var url = 'http://www.asx.com.au/asx/statistics/announcements.do?by=asxCode&asxCode=' + stock + '&timeframe=D&period=T';
        var result = HTTP.call("GET", url);
                               
// Use this is you want to add a user agent:
// HTTP.call("GET", url, { headers: {"User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36"}}); // Added User-Agent

        var content = result.content;
//      greet("Content length:" + content.length);
//      greet("About to load into Cheerio...");
        var $ = cheerio.load(content);
//      greet("Loaded into Cheerio...");
        var count = 0;
        var newsreel = ""; // = stock + ":";

/*      OLD NEWS FORMAT - BEFORE ASX CONVERTED TO BLOBS, MAY 2017
        $('img[class=pricesens]').each(function()
        {
//          <tr class=""><td>23/02/2015</td><td class="pricesens">
//          <img src="/images/asterix.gif" class="pricesens" alt="asterix" title="price sensitive">
//          </td><td>Results for Announcement to the Market           </td>

            var src = $(this).attr('src').toString();
            if (src.indexOf("asterix.gif") > 0) // Important ones contain /images/asterix.gif
            {
//              greet("--> " + $(this).parent().siblings().toString());
                var news = $(this).parent().next().text(); // Item is the next item of img tags parent
                news = news.trim(); // Remove unwanted whitespace
                greet("Found news for " + stock + ":" + news);
                if (count > 0) {     // This is not the first news item
                    newsreel += "^"; // so seperate them with delimeter
                }
                newsreel += news;
                count++;
            }
        }); // S()
        END OF OLD NEWS FORMAT */


/*  =========== [MIDDLE] getStockNews is never called ============================

greet(result.content); // RETURNS A JAVASCRIPT BLOB NOW (SOB)

//      NEW NEWS FORMAT - - - - NEEDS WORK - CURRENTLY SAME AS THE OLD STYLE AND DOESNT DECODE THE NEW ASX BLOB FORMAT!
        $('img[class=pricesens]').each(function()
        {
//          <tr class=""><td>23/02/2015</td><td class="pricesens">
//			<img src="/images/asterix.gif" class="pricesens" alt="asterix" title="price sensitive">
//			</td><td>Investor Presentation - Half Year Results to 31 March 2017  </td>
            greet("Found something in pricesens");
            var src = $(this).attr('src').toString();
            greet("src:" + src.toString());
            if (src.indexOf("asterix.gif") > 0) // Important ones contain /images/asterix.gif
            {
//              greet("--> " + $(this).parent().siblings().toString());
                var news = $(this).parent().next().text(); // Item is the next item of img tags parent
                news = news.trim(); // Remove unwanted whitespace
                greet("Found news for " + stock + ":" + news);
                if (count > 0) {     // This is not the first news item
                    newsreel += "^"; // so seperate them with delimeter
                }
                newsreel += news;
                count++;
            }
        }); // S()

        greet(stock + " has " + count + " news item(s)");
        Stocks.update(id, {
            $set: { News: newsreel
//                , createdAt: new Date() // current time
            }
            }); 
        return stock;
    }, // getStockNews
    
    =========== [END] getStockNews is never called ============================*/

    deleteStock: function(id){
      if (Meteor.isCordova) {
        navigator.vibrate(40); // Vibrate handset
      } 
      var del = Stocks.find({_id: id}, {reactive: false}).fetch(); // Get the record to delete so we can write the stock to stdout
      var ticker = del[0].ticker; // First entry in the array is the record
      greet("\nDeleting "+ticker + " [" + id + "]");
      Stocks.remove(id);
      return ticker;
    }, // deleteStock
    
    KillStock: function(){ // Only for testing!!
      greet("\nKilling all stocks!");
      var toKill = Stocks.find({}, {reactive: false}).fetch();
      for (var i in toKill)
      {
        var stock = toKill[i].ticker;
        greet(i + ") Deleting " + stock + ", id:" + toKill[i]._id);
        Stocks.remove(toKill[i]._id);
      }
    } // KillStock
  });
} // isServer

// Everything in here is only run on the client ==============================================

if(Meteor.isClient) {
    Session.set("S-busy", 'Y'); // On startup assume we're busy
    
    Meteor.subscribe("stocks", function() {
//      CLIENT METHOD
//      Callback...
        Session.set("S-busy", 'N'); // Assume we're not busy now    
    });
    
    Meteor.startup(function () {
//      CLIENT METHOD
        greet("Client is alive");

        Session.set("S-sortStocks",  0);  // Default to sorting by descending (ie largest rises first) so heatmap looks better
        Session.set("S-sortChange", -1);

        Session.set("S-Refresh", new Date()); // Holds timestamp to trick embedded images to reload ie not cache
    
        Session.set("S-GPSLat", ""); // Set GPS to
        Session.set("S-GPSLong", 0); // be off
        
        Session.set("S-camera", '');
        Session.set("S-onlyDivs", 0); // Show all stocks; not just those with dividends
        Session.set("S-onlyASX", 0);  // Show all stocks; not just those on the ASX
        Session.set("S-Debug", true); // Debugging ON by default
                    
    }); // Client startup
    
    function onGPSSuccess(position) {
//      CLIENT METHOD
    /*
    greet('Latitude: '          + position.coords.latitude          + '\n' +
          'Longitude: '         + position.coords.longitude         + '\n' +
          'Altitude: '          + position.coords.altitude          + '\n' +
          'Accuracy: '          + position.coords.accuracy          + '\n' +
          'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
          'Heading: '           + position.coords.heading           + '\n' +
          'Speed: '             + position.coords.speed             + '\n' +
          'Timestamp: '         + position.timestamp                + '\n');
    */

        GPSlat  = position.coords.latitude;
        GPSlong = position.coords.longitude;
        GPSacc  = position.coords.accuracy;
        greet('Found at (' + GPSlat + ',' + GPSlong + ') with accuracy of ' + GPSacc);
        if (GPSacc > 5000)
        {
            GPSlat  = "GPS is too weak";
            GPSlong = 0;
            greet('Weak GPS');
        }
        Session.set("S-GPSLat", GPSlat);
        Session.set("S-GPSLong", GPSlong);

/*      The pre-template way of doing it....
        var element = document.getElementById('GPS');
        if (GPSacc > 5000)
        {
            element.innerHTML = 'GPS is too weak';                
        } else
        {
            element.innerHTML = 'Recently at ('  + GPSlat.toFixed(4) + ',' + GPSlong.toFixed(4) + ')';                            
        }
*/    
    }; // onGPSSuccess

    function onGPSError(error) {
//      CLIENT METHOD
        greet('GPS error ' + error.code + '(' + error.message + ')');
        Session.set("S-GPSLat", "GPS position not available");
        Session.set("S-GPSLong", 0);
//        var element = document.getElementById('GPS');
//        element.innerHTML = ''; // No GPS details   
    };
    
    function onCameraSuccess(imageData) {
//      CLIENT METHOD
        greet('Photo taken');
        var image = document.getElementById('CordovaImage');
        if (image) {
            image.src = "data:image/jpeg;base64," + imageData;
        } else {
          greet("**** No CordovaImage tag in the HTML file");
        }
    };

    function onCameraFail(message) {
//      CLIENT METHOD
        greet('Camera error ' + message);
    };
        
//  ========================    
    Template.home.helpers({
//  ========================    
    
    StockDir: function () { // Format header depending on sort order
        if (Session.get("S-sortStocks") == -1) return "Stock -";
        return "Stock";
    },

    ChangeDir: function () { // Format header depending on sort order
        if (Session.get("S-sortChange") ==  1) return "% +";
        if (Session.get("S-sortChange") == -1) return "% -";
        return "%"; // No particular sort order
    },
    
    GPSLocation: function () {  
      if (!Session.get("S-GPSLat")) return ''; // Starting up
              
      GPSlat = Session.get("S-GPSLat");
      GPSlong= Session.get("S-GPSLong");
      if (GPSlong == 0) {
        return GPSlat; // No valid GPS so GPSlat has the reason
      } else {
        return 'Position is (' + GPSlat.toFixed(4) + ',' + GPSlong.toFixed(4) + ')';      
      }
    },
    
    GoogleMap: function () {  
      if (!Session.get("S-GPSLat")) return 'blank.gif'; // Starting up
              
      GPSlat = Session.get("S-GPSLat");
      GPSlong= Session.get("S-GPSLong");
      if (GPSlong == 0) {
        return "blank.gif"; // No valid GPS so no map (ie blank image)
      } else {
        var map = "https://maps.googleapis.com/maps/api/staticmap?center=" + GPSlat + "," + GPSlong;
        map += "&zoom=15"; // Bigger numbers are more zoomed in
        map += "&size=300x300";
        map += "&maptype=roadmap";
        map += "&markers=" + GPSlat + "," + GPSlong; // Red marker (Default) at current position   
        greet("Google map");
        return map;    
      }
    },

    Camera: function () {  
      return Session.get("S-camera");
    },
    
    REFRESHED: function () { // System friendly format
      if (!Session.get("S-Refresh")) return 'Starting up nicely'; // Starting up
      return Session.get("S-Refresh").getTime();
    },

    REFRESHED_Nice: function () { // Human friendly format without the timezone info eg 'GMT +11 (AEDT)'
      if (!Session.get("S-Refresh")) return "Starting up now"; // Starting up
      var str = Session.get("S-Refresh").toString();
      var nice = str.split("GMT")[0];
      return "Refreshed " + nice;
    },

    Debug: function () {
      return Session.get("S-Debug");
// Can force the check-box to be on using 'return true';
    },
    
    GreetDebug: function () { // Last Greet msg goes to device - not just console
      return Session.get("S-Greet");
    },
    
    BusySymbol: function () { // Show a busy graphic if we are
        if (!Session.get("S-busy")) return "busy.gif"; // Starting up...
        
        if (Session.get("S-busy") != 'N') {
          return "busy.gif"; // "Loading data...";
        } else {
          return "blank.gif"; // Nothing (ie not busy)
        }
    },
    
    stocks: function () {
    // return all the stocks - sorted as we want
    // To sort by date: {sort: {createdAt: -1}});
    
      if (Session.get("S-sortStocks") != 0) {
        return Stocks.find({}, {sort: {ticker: Session.get("S-sortStocks")}}); // Display items sorted by Stock
      } else {
        return Stocks.find({}, {sort: {chgpc: Session.get("S-sortChange")}}); // Display items sorted by last changed percent
      }
    }
  });
//  ========================    

  Handlebars.registerHelper('getSignColour', function(number) {
    if (number > 0) return 'priceUp';
    if (number < 0) return 'priceDown';
    return 'unchanged';
  });
  
  Handlebars.registerHelper('getSignClass', function(number) {
    if (number >=  1) return 'bigUp';
    if (number <= -1) return 'bigDown';
    if (number  >  0) return 'priceUp';
    if (number  <  0) return 'priceDown';
    return 'unchanged';
  });
      
  Handlebars.registerHelper('getDateClass', function(number) {
    if (isToday(number)) return 'dateMatch';
    return 'dateNomatch';
  });

  /* First heatmap method
  Handlebars.registerHelper('getHeatColour', function(number) { // Heatmap colour selection - 14 Jan 2015
    if (number >=  4) return 'HeatUp3';
    if (number >=  2) return 'HeatUp2';
    if (number >=  1) return 'HeatUp1';
    if (number >   0) return 'HeatUp0';
    if (number <= -4) return 'HeatDn3';
    if (number <= -2) return 'HeatDn2';
    if (number <= -1) return 'HeatDn1';
    if (number <   0) return 'HeatDn0';
    return 'HeatFlat';
  });*/

  Handlebars.registerHelper('getHeatColourStyle', function(number) { // Heatmap colour selection - 14 Jan 2015    
    if (isToday(this.XDiv)) return "HSXD";   // Goes XD today
    if (isToday(this.Paid)) return "HSPaid"; // Dividend paid today

    if (this.News) return "HSNews"; // News for this stock

    var aussie = this.ticker.indexOf(".AX");
    if (aussie < 0) {
//       greet("Showing this one as overseas:" + this.ticker);
       return 'HSOverseas'; // Not an Australian stock so colour it differently
    }

    if (number >=  4) return 'HSUp3';
    if (number >=  2) return 'HSUp2';
    if (number >=  1) return 'HSUp1';
    if (number >   0) return 'HSUp0';
    if (number <= -4) return 'HSDn3';
    if (number <= -2) return 'HSDn2';
    if (number <= -1) return 'HSDn1';
    if (number <   0) return 'HSDn0';
    
    return 'HSFlat';
  });

  Handlebars.registerHelper('getHeatColourStyleNews', function(number) { // Heatmap colour selection for the News page
    if (isToday(this.XDiv)) return "HSXD";   // Goes XD today
    if (isToday(this.Paid)) return "HSPaid"; // Dividend paid today

//    if (this.News) return "HSNews"; // Already in News page so don't want to indicate that is has News again
 
    if (number >=  4) return 'HSUp3';
    if (number >=  2) return 'HSUp2';
    if (number >=  1) return 'HSUp1';
    if (number >   0) return 'HSUp0';
    if (number <= -4) return 'HSDn3';
    if (number <= -2) return 'HSDn2';
    if (number <= -1) return 'HSDn1';
    if (number <   0) return 'HSDn0';
    
    return 'HSFlat';
  });  
  
//  ========================    
    Template.home.events({
//  ========================    

    "submit .new-stock": function (event) { // Called when the new stock form is submitted
//      greet("Submit");
//      greet(event); // Was in for learning but seems to crash Meteor!
      
        var text = event.target.text.value;
        
//        greet("Submit text is " + text);
        greet("Adding new stock");        
        Meteor.call('getStock', text.toUpperCase(), 0, function (err, data) {
            if (err) greet("Stock add FAILED");
            else greet("Added " + data + " OK. Now doing dividends");
        });
        
        event.target.text.value = ''; // Clear form
        return false; // Prevent default form submit
    },
     
    "click .refresh": function () {
      // Forces all the stocks to be refreshed - and also forgets GPS position and any camera image
          
      if (Meteor.isCordova) {
        navigator.vibrate(100); // Vibrate handset
        greet("Bzzzzz");      
      }
    
      // Forget GPS and Camera items too

      Session.set("S-GPSLat", "");
      Session.set("S-GPSLong", 0);
      Session.set("S-camera", '');
      var image = document.getElementById('CordovaImage');
      if (image)
      {
        image.src = "blank.gif";
      } else { // If no CordovaImage tag in the HTML we send a message. If we don't check this would get an exception
        greet("**** No CordovaImage tag in the HTML file");
      }
    
      var toRefresh = Stocks.find({}, {reactive: false}).fetch();
      for (var i in toRefresh)
      {
        var str = toRefresh[i].ticker;
        greet("Refreshing "+str+" at "+toRefresh[i]._id);
        Meteor.call('getStock', str, toRefresh[i]._id, function (err, data) {
            if (err) greet("getStock FAILED");
            else greet("getStock refreshed " + data + " OK"); // Not necessarily OK - see log in Meteor console - cannot pass back from callback unfortunately?!
        });
// NO NEWS ANY MORE DUE TO ASX OBFUSCATING THE CODE - BUMMER!
//      greet("News Refreshing Suspended for " + str);
        /*====== NEWS IS SUSPENDED FOR NOW DUE TO ASX OBFUSCATING THE CODE
        greet("Refreshing News for " + str);
        Meteor.call('getStockNews', str, toRefresh[i]._id, function (err, data) {
            if (err) greet("News refresh FAILED");
            else greet("News refreshed for " + data);
        });
        ======*/
      }
      
      greet("Getting dividends");
      Meteor.call('getDividends', function (err, data) {
                if (err) greet("Dividend get FAILED");
                else greet("Dividend get OK. " + data + " found");
        }); // Refresh the dividends - but only after async process is completed
    
      Session.set("S-Refresh", new Date()); // Forces reload of any embedded images ie stops browser cache
      
    }, // refresh
    
    "click .location": function () {
      // Refreshes GPS location
      /**********
      if (Meteor.isCordova) {
        Session.set("S-GPSLat", "Finding position...");
        Session.set("S-GPSLong", 0);
        navigator.vibrate(40); // Vibrate handset
        navigator.geolocation.getCurrentPosition(onGPSSuccess, onGPSError, { timeout: 3000 }); // Update GPS position - max wait 3 secs        
      } else {
        greet("No GPS");
        Session.set("S-GPSLat", "No GPS device");
        Session.set("S-GPSLong", 0);
      }
      ********* USING THIS TO REFRESH THE UVDATA******/
        greet("Refreshing UV Data");
        Meteor.call('getUV', "mel", function (err, data) {
            if (err) greet("getUV FAILED");
            else greet("getUV refreshed " + data + " OK");
        });

    }, // location

    "click .camera": function () {
      // Takes a photo
      if (Meteor.isCordova) {
        navigator.camera.getPicture(onCameraSuccess, onCameraFail, { quality: 50,
        destinationType: Camera.DestinationType.DATA_URL
        });
      } else {
        greet("No Camera"); // One day this might use the webcam for laptops etc
        Session.set("S-camera", "No Camera available");
      }
    }, // camera

    "click .onlydivs": function () {
      // Show only stocks with dividends soon
      var onlyDivs = Session.get("S-onlyDivs");
      if (onlyDivs == 0) {
        greet("Only showing dividend stocks");
        Session.set("S-onlyDivs", 1); // Now only showing dividend stocks
      } else {
        greet("Showing all stocks");
        Session.set("S-onlyDivs", 0);
      }    
    }, // onlyDivs
    
    "click .onlyASX": function () {
      // Show only stocks on the ASX
      var onlyASX = Session.get("S-onlyASX");
      if (onlyASX == 0) {
        greet("Only showing ASX stocks");
        Session.set("S-onlyASX", 1);  // Now only showing ASX stocks
        Session.set("S-onlyDivs", 0); // Show all ASX, not just dividend stocks
      } else {
        greet("Showing all stocks");
        Session.set("S-onlyASX", 0);
      }    
    }, // onlyASX

    "click .sortStocks": function () {
      // Sort result by Stock name
      var sorting = Session.get("S-sortStocks");
      if (sorting == 1) {
        Session.set("S-sortStocks",-1); // Was in alpha order, now in reverse alpha
        Session.set("S-sortChange", 0);
      } else {
        Session.set("S-sortStocks", 1); // Now in alpha order
        Session.set("S-sortChange", 0);
      }    
    }, // sortStocks

    "click .sortChange": function () {
      // Sort result by percent changed
      var sorting = Session.get("S-sortChange");
      if (sorting == -1) {
        Session.set("S-sortChange", 1); // Now Ascending (ie biggest LOSSES first)
        Session.set("S-sortStocks", 0);
      } else {
        Session.set("S-sortChange",-1); // Now Descending (ie biggest GAINS first)
        Session.set("S-sortStocks", 0);
      }    
    }, // sortChange

    // Add to Template.body.events
    "change .debug input": function (event) {
      if (Session.equals("S-Debug", true)) {
        Session.set("S-Greet", "Debug now on");
      } else {
        Session.set("S-Greet", "");        
      }
    } // debug
    
  }); // Template.home.events

//  ========================    
    Template.body.events({
//  ========================    
        
//  NONE!!!

  }); // Template.body.events
  
//  ========================    
    
//  ========================    
    Template.stock.events({
//  ========================    
    
    "click .delete": function () {
      // Remove this entry if x clicked
      var stock = this.ticker; // Was ripStock(this.text);
      greet("Deleting "+this.ticker);
      Meteor.call('deleteStock', this._id, function (err, data) {
        if (err) greet("Delete FAILED");
        else greet("Deleted " + data + " OK");
      });
//    Meteor.call('KillStock'); // Only for testing!!!
    },

    "click .update": function () {
      // Update the values for this item when ticker is clicked
      var stock = this.ticker;
      greet("Updating "+stock);
      if (Meteor.isCordova) {
        navigator.vibrate(40); // Vibrate handset briefly
      }
      Meteor.call('getStock', stock, this._id, function (err, data) {
        if (err) greet("Update FAILED");
        else greet("Updated " + data + " OK");
      });
    }
    
  });
//  ========================    

//  ========================    
    Template.stock.helpers({
//  ========================    

    code: function () { // Formats the stock code (removes any index name from the display)
      var str = this.ticker;
      if (str.indexOf("DJI.US") == 0 )  return "Dow Jones";
      if (str.indexOf("SPX.US") == 0 )  return "S&P500";
      if (str.indexOf("IXIC.US") == 0 ) return "NASDAQ";     
      var dotpos = str.indexOf('.');
      return str.substring(0,dotpos);
    },

    last: function () { // Formats last price
        if (this.last >= 1000)
        {
            var n = this.last.toFixed(0); // No cents for large value stocks (eg Dow Jones index)
            return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Inserts , at 1000's - Thanks StackOverflow!
        } else {
            return this.last.toFixed(2); // 2 decimal places ie dollars and cents
        }
    },
    
    chg: function () { // Formats change
      return this.chg.toFixed(2); // 2 decimal places
    },
    
    chgPC: function () { // Formats change in percent
      return this.chgpc.toFixed(1); // 1 decimal place
    },
    
    dXDiv: function () { // Formats XDiv date display
        if (isToday(this.XDiv)) return "XDiv"; // If it's today, say so
        var niceDate = this.XDiv.replace(/^0/, ''); // Drop any leading zero eg 02 Apr -> 2 Apr  
        return niceDate; // Return date it's XD (minus any leading 0)
    },
    
    dPaid: function () { // Formats Paid date display
        if (isToday(this.Paid)) return "Paid"; // If it's today, say so
        var niceDate = this.Paid.replace(/^0/, ''); // Drop any leading zero eg 02 Apr -> 2 Apr       
        return niceDate; // Return date it's paid (minus any leading 0)
    },
    
    News: function () { // Identify if there are news items      
        if (this.News) return "visible"; // Was "*";
        return "hidden"; // was "";
    },
    
    isVisible: function () { // Decide if this stock line should be visible
        // If showing dividends: Show if there is one, otherwise hide (collapse)
        // If showing ASX stocks: Show if it is one, else collapse
        var onlyDivs = Session.get("S-onlyDivs");
        if (onlyDivs == 1) // Dividends only
        {
            if (this.Franked) return "visible"; // There is a dividend, so visible
            return "collapse"; // otherwise hide this entire row    
        }
        var onlyASX = Session.get("S-onlyASX");
        if (onlyASX == 1) // ASX shares only
        {
            var aussie = this.ticker.indexOf(".AX");
            if (aussie < 0) return "collapse"; // This is not ASX so hide
        }
        return "visible"; // otherwise show
    }
  });
//  ========================    
    
//  ========================    
    Template.heatmap.helpers({
//  ========================    

    code: function () { // Formats the stock code (removes any exchange name from the display)
        var str = this.ticker;
        if (str.indexOf("DJI.US") == 0 )  return "Dow";
        if (str.indexOf("SPX.US") == 0 )  return "S&P";
        if (str.indexOf("IXIC.US") == 0 ) return "Nas";    
        var dotpos = str.indexOf('.');
        return str.substring(0,dotpos); // Perhaps could change to not return anything for heatmap
    },

    last: function () { // Formats last price for the HEATMAP
        if (this.last >= 1000)
        {
            var n = this.last.toFixed(0); // No cents for large value stocks (eg Dow Jones index)
            return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Inserts , at 1000's - Thanks StackOverflow!
        } else {
            return this.last.toFixed(2); // 2 decimal places ie dollars and cents
        }
    },
    
    chgPC: function () { // Formats change in percent
        return this.chgpc.toFixed(1); // 1 decimal place in Heatmap
    },

    isVisible: function () { // Decide if this stock in the heatmap
        // If showing dividends: Show if there is one, otherwise hide (collapse)
        // If showing ASX stocks: Show if it is one, else collapse
        var onlyDivs = Session.get("S-onlyDivs");
        if (onlyDivs == 1) // Dividends only
        {
            if (this.Franked) return "visible"; // There is a dividend, so visible
            return "collapse"; // otherwise hide this entire row    
        }
        var onlyASX = Session.get("S-onlyASX");
        if (onlyASX == 1) // ASX shares only
        {
            var aussie = this.ticker.indexOf(".AX");
            if (aussie < 0) return "collapse"; // This is not ASX so hide
        }
        return "visible"; // otherwise show
    }
    
  });
//  ========================

//  ========================    
    Template.heatmapNews.helpers({
//  ========================    

    code: function () { // Formats the stock code (removes any exchange name from the display)
        var str = this.ticker;      
        var dotpos = str.indexOf('.');
        return str.substring(0,dotpos); // Could change to return nothing for heatmap it it's an index but then there will never be any news so pointless
    },

    last: function () { // Formats last price
        return this.last.toFixed(2); // 2 decimal places ie dollars and cents
    },
    
    chgPC: function () { // Formats change in percent
        return this.chgpc.toFixed(1); // 1 decimal place in Heatmap News
    }
    
  });
//  ========================

//  ========================    
    Template.news.helpers({
//  ========================    

    stocks: function () {
        return Stocks.find({"News":{$ne:""}}, {sort: {chgpc: -1}}); // News only items sorted by largest % change
    }
});
    
//  ========================

//  ========================    
    Template.stocknews.helpers({
//  ========================    

    code: function () { // Formats the stock code (removes any exchange name from the display)
        var str = this.ticker;      
        var dotpos = str.indexOf('.');
        return str.substring(0,dotpos);
    },
    
    News: function () { // Formats stock news
        if (!this.News) return ""; // No news - should never see this as Mongo call only returns news items
        var news = this.News.split("^");
        return news[0]; // This needs work to return all the news items nicely
    }

    });
//  ========================

} //is Client
