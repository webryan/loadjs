/**
 * 
 * @fileoverview LoadJS 
 * @version 2.0
 * @author webryan,henryguo glancer.h@gmail.com modify by herbertliu
 * @lastUpdate 2012-11-22 10:54 
 * @function: 并行异步加载js且保持有序性;默认重试2次
 * @example: loadjs.load(['a.js','b.js'],[function(){},function(){}]).wait(fn).load('c.js').wait().load('d.js');
 */
(function(){
	//处理列表及函数预定义,waitls,downls,donels表示js下载三种状态,tryls重试次数，flagls检查变量标记方法；exechash表示h5里执行; onload,loadfile用于回调和加载逻辑，curpos表示循环起始坐标
	var waitls = [],downls = [],donels = [],tagls = [],tryls = [],flagls = [],exechash={},onload,loadfile,process,curpos=0,_config={retry:2,err:function(){}},scripts = [];
	//加载文件部分的逻辑
	var test = document.createElement('script');
	var appendTo = document.head || document.getElementsByTagName('head')[0];
	//支持readyState
	if (test.readyState&&test.readyState=='uninitialized'){
		loadfile = function(src){
			var t = document.createElement('script');			
			t.onload = t.onreadystatechange =  function(){ 
				if((t.readyState=='complete' || t.readyState=='loaded')&&(!t.name)){
					t.name = 1;
					t.onload = t.onreadystatechange  = t.onerror = null;
					onload(t,src);
				}
			};
			t.src = src;
			
			//ie bug,文件太大以或者时间太长会导致t丢失
			scripts.push(t);//保存引用
		}
		process = function(t,i){
			appendTo.appendChild(t);
			var src = t.src;//文件路径
			
			var flag = true;
			if(flagls[src] && flagls[src](tryls[i],_config['retry'],src)){//存在检验方法且检查失败,重试检查,当前处在第几次重试中,0表示未重试
				if (tryls[i]<_config['retry']){
					tryls[i] = tryls[i]+1;
					setTimeout(function(){loadfile(src)},0);
					flag = false;
				}else{
					_config.err(waitls[i]);
				} 	
			}
			if(flag){
				donels[i] = 1;
				tagls[i] = null;
				exechash[src] && exechash[src]();
				curpos = i + 1;
				if(i == waitls.length-1){
					scripts.length = 0;//清除数组数据
				}
			}
		};
		onload = function(t,src){
			var flag = 1,exec = 0; //flag表示当前i之前是否都下载执行了。
			for (var i= curpos,len=waitls.length;i<len;i++){
				if (t.src.indexOf(waitls[i])>-1){
					downls[i] = 1;
					//判断当前下载完的文件,是否可插入；然后再判断在数组后面的元素是否可以插入或执行
					if (flag){
						process(t,i); //执行文件
						continue;
					}else{
						tagls[i] = t;	
					}
				}
				//判断当前链上是否都完成
				if (downls[i]){//当前位置已经下载完成
					//判断是否需要把下载处理的处理掉
					if (flag&&(!donels[i])){//当前位置之前的所有script都已经加载完成,并且当前js还未被执行
						process(tagls[i],i);//执行文件
					}
				}else{
					flag = 0;
				}
			}
		}
	//支持async
	}else if (test.async===true){
		loadfile = function(src,dom){
			var t = document.createElement('script');	
			t.async = false;
			t.type = 'text/javascript';
			t.onload = function(){
				t.onload = t.onerror =  null;
				onload(src,t);
			};
			t.onerror  = function(){
				t.onerror = t.onload = null	
				_config.err();
			}
			t.src = src;
			(dom||appendTo).appendChild(t);
		}
		onload = function(src,t){
			if (exechash[src]) exechash[src](); 
		}
	}
	//补充img -- 暂时先不要，回头做test suite
	test = null;
	//对外接口，load(js file,fn),wait(fn)两个; 其中fn重试的方法集,当fn返回true时，重试
	window.loadjs = {
		load : function(f,fn){
			var ls = (f instanceof Array)?f:[f],curlen=waitls.length-1,fn = fn?(fn instanceof Array)?fn:[fn]:null;
			for (var i=0,len=ls.length;i<len;i++){
				waitls.push(ls[i]);
				downls.push(0);
				tryls.push(0);
				if(fn && fn[i] && (typeof(fn[i]) == 'function')){
					flagls[ls[i]] = fn[i];//将回调检验
				}
				loadfile(ls[i]);
			}
			return this;
		},
		wait : function(fn){
			fn = fn||function(){}
			exechash[waitls[waitls.length-1]] = fn; //放到wait前最后一个js下载后执行
			return this;
		},
		//默认重试2次，可以修改重试；{retry:2,err:fn} retry:重试次数，err:加载异常提示
		config : function(o){
			for (var k in o){
				_config[k] = o;
			}
			return this;			
		}
	};
})();
