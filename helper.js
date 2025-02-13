var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) {d[p] = b[p];}
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

function prefix(name) {
    return "_" + name;
}

function __ajax(options){
    options=options||{};
    options.type=(options.type||'GET').toUpperCase();
    options.dataType=options.dataType||'json';
    var params=formatParams(options.data);

    var xhr;
    if(window.XMLHttpRequest){
        xhr=new XMLHttpRequest();
    }else{
        xhr=ActiveXObject('Microsoft.XMLHTTP');
    }

    xhr.onreadystatechange=function(){
        if(xhr.readyState === 4){
            var status=xhr.status;
            if(status>=200 && status<300){
                options.success&&options.success(xhr.responseText,xhr.responseXML);
            }else{
                options.error&&options.error(status);
            }
        }
    }

    if(options.type==='GET'){
        xhr.open('GET',options.url+'?'+params,true);
        xhr.send(null);
    }else if(options.type==='POST'){
        xhr.open('POST',options.url,true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send(params);
    }
}

function formatParams(data){
    var arr=[];
    for(var name in data){
        arr.push(encodeURIComponent(name)+'='+encodeURIComponent(data[name]));
    }
    return arr.join('&');
}



export {
    __extends,
    prefix,
    __ajax,
    formatParams,
}