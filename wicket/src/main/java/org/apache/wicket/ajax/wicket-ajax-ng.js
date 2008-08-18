(function() {
	
	/*
	 * YUI Shortcuts 
	 */
	var D = YAHOO.util.Dom;
	var E = YAHOO.util.Event;
	var L = YAHOO.lang;
	var UA = YAHOO.env.ua;
	
	var oldWicket = window.Wicket;	
	
	Wicket = { };

	/*
	 * Wicket.$, Wicket.$$
	 */
	
	Wicket.$ = function(arg) 
	{
		if (arg == null || typeof(arg) == "undefined") 
		{
			return null;
		}
		if (arguments.length > 1) 
		{
			var e=[];
			for (var i=0; i<arguments.length; i++) 
			{
				e.push(Wicket.$(arguments[i]));
			}
			return e;
		} 
		else if (typeof arg == 'string') 
		{
			return document.getElementById(arg);
		} 
		else 
		{
			return arg;
		}
	}

	var bind = function(method, object) 
	{		
		return function() 
		{
			return method.apply(object, arguments);
		}
	}
	
	/**
	 * Returns true if the argument element belongs to the current document.
	 * If the argument is a string, returns whether the document contains element with given id.
	 * If the argument is neither element nor a string function returns true.
	 */
	Wicket.$$ = function(element) 
	{	
		if (L.isString(element)) 
		{
			return Wicket.$(element) != null;
		}
		else 
		{	
			return D.inDocument(element);
		}
	}
	
	/*
	 * Utility
	 */
	var copyArray = function(array)
	{
		var res = new Array();
		for (var i = 0; i < array.length; ++i)
		{
			res.push(array[i]);
		}
		return res;
	}
	
	var iterateArray = function(array, itemFunc)
	{
		if (L.isArray(array)) 
		{
			for(var i = 0; i < array.length; ++i)
			{
				var res = itemFunc(array[i]); 
				if (res != null)
				{
					return res;
				}
			}
		}
		else if (!L.isUndefined(array) && !L.isNull(array))
		{
			return itemFunc(array);
		}		
		return null;
	}
	
	/*
	 * Logging
	 */
	var DummyLogger = 
	{
		trace: function() { },
		debug: function() { },
		info: function() { 	},
		error: function() { }
	}		
	
	var FirebugLogger =
	{
		arg: function(type, args)
		{			
			var first = args[0];			
			var a = copyArray(args).slice(1);
			if (args.length > 1)
			{
				a.unshift("|");
			}
			a.unshift(first);
			a.unshift("|");			
			a.unshift(type);
			return a;
		},
		trace: function()
		{						
			console.debug.apply(this, FirebugLogger.arg("TRACE", arguments));
		},
		debug: function() 
		{
			console.debug.apply(this, FirebugLogger.arg("DEBUG", arguments));
		},
		info: function() 
		{
			console.info.apply(this, FirebugLogger.arg("INFO", arguments));
		},
		error: function() 
		{
			console.error.apply(this, FirebugLogger.arg("ERROR", arguments));
		}
	}
	
	var logger = DummyLogger;
	
	if (UA.gecko && typeof(console) !== "undefined" && logger === DummyLogger)
	{
		logger = FirebugLogger;
	}	
	
	var logConfig = { trace: true, debug: true, info: true, error: true, "trace:GarbageCollector": false };
	
	Wicket.Log  = 
	{
		trace: function()
		{
			if (logConfig.trace && logConfig[arguments[0]] != false && logConfig["trace:" + arguments[0]] != false)
				logger.trace.apply(this, arguments);
		},
		debug: function()
		{
			if (logConfig.debug && logConfig[arguments[0]] != false && logConfig["debug:" + arguments[0]] != false)
				logger.debug.apply(this, arguments);
		},
		info: function()
		{
			if (logConfig.info && logConfig[arguments[0]] != false && logConfig["info:" + arguments[0]] != false)
				logger.info.apply(this, arguments);
		},
		error: function()
		{
			if (logConfig.error && logConfig[arguments[0]] != false && logConfig["error:" + arguments[0]] != false)
				logger.error.apply(this, arguments);
		},
		setLogger: function(newLogger)
		{
			logger = newLogger;
		},
		getLogger: function()
		{
			return logger;
		},
		isDummyLogger: function()
		{
			return logger == DummyLogger;
		},
		getLogConfig: function() 
		{
			return logConfig;
		}
	};
		
	// convenience shortcut
	var log = Wicket.Log;
	
	/*
	 * Garbage Collection (for removing event listeners from elements removed from DOM)
	 */
	
	/**
	 * YAHOO event cleanups the listeners only on page unload. However, if the page lives long
	 * enough the elements removed from document that have listener attached cause IE GC not free the
	 * memory. So we manually register each element with listener and then periodically check 
	 * whether the element is still in document. If it's not the element's listeners are removed.
	 */	
	var GarbageCollector = function(purgeInterval) 
	{
		this.elementsWithListeners = new Array();
		
		// temporary array of elements being processed during purge
		this.beingPurged = null;
		
		// count of purged elements (debug)
		this.purgedCount = 0;
		
		this.purgeInterval = purgeInterval;
		
		window.setInterval(bind(this.purgeInactiveListeners, this), purgeInterval);
	};

	GarbageCollector.prototype = 
	{
		// periodically called to initiate the purging process
		purgeInactiveListeners : function() 
		{		
			// if purge is in progress don't do anything
			if (this.beingPurged != null) {
				return;
			}
			
			// the the elements
			this.beingPurged = this.elementsWithListeners;
			this.elementsWithListeners = new Array();
			
			log.trace("GarbageCollector", "Purge begin");
			
			this.purgedCount = 0;
			
			// start the process
			this.purge();
		},
		
		purge: function() 
		{
			if (this.beingPurged != null)
			{
				var done = 0;
				
				// it is necessary to limit amount of items being purged in one go otherwise
				// IE will complain about script being slow
				var max = 50;
				
				var a = this.beingPurged;
				for (var i = 0; i < a.length && done < 50; ++i)
				{
					var e = a[i];
					if (e != null)
					{
						++done;
						if (!Wicket.$$(e)) {
							E.purgeElement(e);
							++this.purgedCount;
						} else {
							// element is still in document, return it
							this.elementsWithListeners.push(e);
						}
						a[i] = null;
					}			
				}
								
				if (i == a.length)
				{
					// we are done with purging
					this.beingPurged = null;
					
					log.trace("GarbageCollector", "Purge End; purged: " + this.purgedCount + ", total: " + this.elementsWithListeners.length);
				}		
				else
				{
					// not yet done, continue after 50ms
					window.setTimeout(bind(this.purge, this), 50);
				}
			}
		}	
	}
	
	var garbageCollector = new GarbageCollector(5000);
	
	var oldAddListener = E.addListener;
	
	/**
	 * Intercept the YAHOO.util.Event.addListener method and append the element
	 * to elementsWithListeners array so that we can purge it once it get removed from DOM;
	 */
	E.addListener = function(el)
	{		
		log.trace("Events", "Adding event listeners", arguments);
		oldAddListener.apply(this, arguments);
		if (el !== window && el !== document)
		{
			var a = garbageCollector.elementsWithListeners;
			a.push(Wicket.$(el));			
		}
	};
	
	E.addListener(window, "unload", function() { garbageCollector = null; } );
	
	/*
	 * Throttler
	 */
	
	var ThrottlerEntry = function(func)
	{
		this.func = func;
	};
	
	/**
	 * Throttler is responsible for throttle down function execution to make sure that is not
	 * executed more often that the specified interval. Throttler can be used to reduce number
	 * of AJAX requests. To match function with previously executed functions a (string) token
	 * is used.
	 */
	var Throttler = function()
	{
		this.entries = { };
		this.executionTimes = { };
	};
	
	Throttler.prototype = 
	{
		/**
		 * Either execute the specified function immediately, or postpone the execution if function
		 * with same token has been invoked in time that is less than "millis" milliseconds from now.
		 * 
		 * @param token - string token to match previously executed function with the one specified now
		 * @param millis - how much to postpone the function after the last invocation
		 * @param func - function
		 * @param postponeTimerOnUpdate is an optional parameter. If it is set to true, then the timer is
	     *    reset each time the throttle function gets called. Use this behavior if you want something
	     *    to happen at X milliseconds after the *last* call to throttle.
	     *    If the parameter is not set, or set to false, then the timer is not reset.
	     *    This can be useful for throttling events based on keyboard input. The function can be called
	     *    for example 2 seconds after the last key stroke.
		 */
		throttle: function(token, millis, func, postponeTimerOnUpdate)
		{
			postponeTimerOnUpdate = postponeTimerOnUpdate || false;

			// check if throttling is necessary. thottling is always necessary when postponeTimerOnUpdate 
		    // is true
			if (!postponeTimerOnUpdate && this.checkLastExecutionTime(token, millis, func))
			{
				return;
			}
			var entry = this.entries[token];
			if (entry == null)
			{
				entry = new ThrottlerEntry(func);
				entry.timeout = window.setTimeout(bind(function() { this.execute(token) }, this), millis);
				this.entries[token] = entry;
				log.trace("Throttler", "Setting throttle, token:", token, ", millis:", millis, ", func:", func);
			}
			else
			{
				entry.func = func;
				if (postponeTimerOnUpdate)
				{
					window.clearTimeout(entry.timeout);
					entry.timeout = window.setTimeout(bind(this.execute, this), millis);
					log.trace("Throttler", "Postponing throttle, token:", token, ", millis:", millis, ", func:", func);
				}
				else
				{
					log.trace("Throttler", "Replacing throttle, token:", token, ", millis:", millis, ", func:", func);
				}
			}
		},
		
		// Checks if the function needs to be postponed. If not, executes it immediately and returns true.
		// Otherwise returns false.
		checkLastExecutionTime:function(token, millis, func)
		{
			var e = this.executionTimes[token];
			var now = new Date().getTime();
			if (e == null || (e + millis) < now)
			{
				log.trace("Throttler", "Executing function immediately, token:", token, ", millis:", millis, ", func:", func);
				this.executionTimes[token] = now;
				this.entries[token] = null;
				func();
				return true;
			}
			else
			{
				return false;
			}
		},
		
		execute: function(token)
		{			
			var entry = this.entries[token];
			if (entry != null)
			{				
				var f = entry.func;
				log.trace("Throttler", "Invoking throttled function, token:", token, "func:", f);
				this.entries[token] = null;
				this.executionTimes[token] = new Date().getTime();
				f();				
			}
		}
	};
	
	var isNonEmpty = function(string) 
	{
		return L.isString(string) && string.length > 0;
	}
	
	Wicket.Throttler = Throttler;	
	
	/*
	 * AJAX
	 */
	
	/**
	 * An item in a RequestQueue. Item constructor get a map of configuration attributes. Each attribute 
	 * can be either specified by a full name or by a shortcut.   
	 * 
	 * Possible attributes:
	 * 
	 *   SHORTCUT, NAME            TYPE       DESCRIPTION
	 *   
	 *   c, component            - Element    Component responsible for the AJAX request or null           
	 *                                        when the component is a page. If there is no DOM element 
	 *                                        for the component the attribute can contain a string 
	 *                                        (Component#getMarkupId()). The string is then used to find
	 *                                        the matching component on the server side.
	 *                                        
	 *                                        The element is also used as precondition. The element must 
	 *                                        be part of the DOM tree otherwise the item will be ignored.
	 *                                         
	 *   f, formId               - String     Form ID if the AJAX request should submit a form or null
	 *                                        if the request doesn't involve form submission
	 *                                        
	 *   m, multipart	         - Boolean    (only when formId is not null) True if the form submit should
	 *                                        be multipart, false otherwise. Note that for multipart AJAX 
	 *                                        requests a hidden IFRAME will be used and that can have 
	 *                                        negative impact on error detection.
	 *                                         
	 *   t, requestTimeout       - Integer    Timeout in milliseconds for the AJAX request. This only 
	 *                                        involves the actual communication and not the processing 
	 *                                        afterwards. Can be null in which case the default request
	 *                                        timeout will be used.
	 *                                        
	 *   pt, processingTimeout   - Integer    Timeout for the response processing. In case the response
	 *                                        processing takes more than the timeout it won't block the
	 *                                        request queue.
	 *          
	 *   p, pageId               - String     Used to identify the originating page. String in form of
	 *                                        <pageId>:<pageVersion>
	 *          
	 *   l, listenerInterface    - String     Listener interface name that will be used when building
	 *                                        the URL. Can be null if a behavior should be invoked. 
	 *                                        
	 *   b, behaviorIndex        - Integer    Index of behavior that should be invoked on the component
	 *                                        in case the listenerInterface is null
	 *                                        
	 *   t, token                - String     Optional string identifying related items in request queue. 
	 *                                        Used to identify previous items (items with same token) that 
	 *                                        will be removed when this item is added and removePrevious 
	 *                                        is true. Also required when throttle attribute is used.
	 *        
	 *   r, removePrevious       - Boolean    Optional. If there are previous items with same token in the 
	 *                                        queue they will be removed if removePrevious is true. This 
	 *                                        can be useful when the items are added in queue faster
	 *                                        than they are processed and only the latest request matters.
	 *                                        An example of this could be periodically updated component.
	 *                                        There is no point of having multiple refreshing requests
	 *                                        stored in the queue for such component because only the
	 *                                        last request is relevant. Alternative to this is the
	 *                                        throttle attribute.  
	 *   
	 *   th, throttle            - Integer    Optional. Limits adding items with same token to at most one 
	 *                                        item per n milliseconds where n is the value of throttle 
	 *                                        attribute. Useful to limit the number of AJAX requests that 
	 *                                        are triggered by a user action such as typing into a text 
	 *                                        field. 
	 *                                        Throttle attribute only applies when token is specified.   
	 *                                        
	 *   thp, throttlePostpone   - Boolean    Optional. Only applicable when throttle attribute is set.
	 *                                        Defaults to false. Causes the throttle timer reset each time
	 *                                        item with same token is being added to queue. 
	 *                                        Example: Event is fired by user typing in a textfield. 
	 *                                        Throttle value is 2000 (ms), throttle postpone is true.
	 *                                        The event will be fired 2000ms after user typed the last 
	 *                                        character. 
	 *                                        If throttle postpone is false, The event is fired immediately 
	 *                                        after user starts typing and then every two seconds as long
	 *                                        as user keeps typing.
	 *   
	 *   pr, preconditions       - Method(s)  Optional. Method or array of methods that is/are invoked 
	 *                                        before the request executes. The method(s) will get this 
	 *                                        RequestItem passed as fist argument and have to return 
	 *                                        a boolean value. If any of these methods returns false the 
	 *                                        request is canceled.
	 *                                        
	 *   be, beforeHandlers      - Method(s)  Optional. Method or array of methods that is/are invoked
	 *                                        before the actual AJAX request. This invocation only 
	 *                                        happens when all precondition methods return true.  
	 *                                        
	 *   s, successHandlers      - Method(s)  Optional. Method or array of methods that is/are invoked 
	 *                                        after the request is successfully processed. The method(s) 
	 *                                        will get this RequestQueueItem passed as fist argument.  
	 *                                        
	 *   e, errorHandlers        - Method(s)  Optional. Method or array of methods that is/are invoked when 
	 *                                        an error happens during the AJAX request or the processing 
	 *                                        afterwards, or when some of the timeouts is exceeded. The 
	 *                                        method(s) will get this RequestQueueItem passed as fist 
	 *                                        argument. 
	 *                                        
	 *   u, urlPostProcessors    - Method(s)  Optional. Method or array of methods that can postprocess 
	 *                                        the URL before it hits the server. Each of the methods 
	 *                                        will get the URL as first argument and this RequestQueueItem 
	 *                                        as second argument and must return postprocessed URL.
	 *                                        
     *   ua, urlArguments        - Object     Optional. Map that contains additional URL arguments. These 
     *                                        will be appended to the URL before postprocessing it. This is 
     *                                        simpler alternative to urlPostProcessor or urlArgumentMethods.
     *                                        
     *   uam, urlArgumentMethods - Method(s)  Optional. Method or array of methods that produce additional 
     *                                        URL arguments. Each of the methods will get this 
     *                                        RequestQueueItem passed and must return a 
     *                                        Map<String, String> (Object).
	 */
	var RequestQueueItem = function(attributes)
	{
		var a = attributes;
		var b = function(value) 
		{
			if (value) 
				return true;
			else
				return false;
		}
		var createMethodArray = function(methodOrArray) 
		{			
			if (L.isFunction(methodOrArray))
				return [methodOrArray];
			else if (L.isArray(methodOrArray))
				return methodOrArray;
			else {				
				return [];
			}
		}
		var m = function(m1, m2)
		{
			m1 = createMethodArray(m1);
			m2 = createMethodArray(m2);
			return m1.concat(m2);
		}
		var gs = Wicket.ajax.globalSettings;
		
		this.attributes  = 
		{
			component:            a.component          || a.c,
			formId:               a.formId             || a.f,
			multipart:          b(a.multipart          || a.m),
			requestTimeout:       a.requestTimeout     || a.t    || gs.defaultRequestTimeout,
			processingTimeout:    a.processingTimeout  || a.pt   || gs.defaultProcessingTimeout,
			pageId:               a.pageId             || a.p    || gs.defaultPageId,
			listenerInterface:    a.listenerInterface  || a.l    || gs.defaultToken,
			behaviorIndex:        a.behaviorIndex      || a.b,
			token:                a.token              || a.t,			
			removePrevious:     b(a.removePrevious     || a.r    || gs.defaultRemovePrevious),
			throttle:             a.throttle           || a.th,
			throttlePostpone:   b(a.throttlePostpone   || a.thp),
			preconditions:      m(a.preconditions      || a.pr,  gs.preconditions),
			beforeHandlers:     m(a.beforeHandlers     || a.be,  gs.beforeHandlers),
			successHandlers:    m(a.successHandlers    || a.s,   gs.successHandlers),
			errorHandlers:      m(a.errorHandlers      || a.e,   gs.errorHandlers),
			urlPostProcessors:  m(a.urlPostProcessors  || a.u,   gs.urlPostProcessors),
			urlArguments:         a.urlArguments       || a.ua,
			urlArgumentMethods: m(a.urlArgumentMethods || a.uam, gs.urlArgumentMethods)
		}
		
		log.trace("RequestQueue", "Creating New Item", this.attributes);
	}
	
	RequestQueueItem.prototype = 
	{
		checkPreconditions: function() 
		{
			var res = iterateArray(this.preconditions, function(precondition) 
			{
				try 
				{
					if (precondition(this) == false)
					{
						return false;
					}
				} 
				catch (exception) 
				{
					log.error("RequestQueue", "Error evaluating precondition ", precondition, "Exception: ", exception);
					return false;
				}
			});
			if (res == null)
			{
				return true;
			}
			else
			{
				return false;
			}
		},
		
		execute: function(next)
		{
		}
	};
	
	var RequestQueue = function()
	{
		this.queue = new Array();
		this.throttler = new Throttler();
	};
	
	RequestQueue.prototype = 
	{
		addInternal: function(item) 
		{			
			var a = item.attributes;
			if (a.removePrevious) 
			{
				if (!isNonEmpty(a.token)) 
				{
					log.warn("RequestQueue", "Item ", item, " has removePrevious set but no token specified - ignored");
				} 
				else 
				{
					this.removeByToken(a.token);
				}
			}
			this.queue.push(item);
			
			if (this.currentItem == null) 
			{
				this.next();
			}
		},
		
		removeByToken: function(token) 
		{
			if (token != null) 
			{
				for (var i = 0; i < this.queue.length; ++i) 
				{
					var item = this.queue[i];
					if (item.attributes.token == token) 
					{
						this.queue[i] = null;
					}
				}
				var q = this.queue;
				this.queue = new Array();
				for (var i = 0; i < q.length; ++i) 
				{
					if (q[i] != null) 
					{
						this.queue.push(q[i]);
					}
				}
			}
		},
		
		add: function(item) 
		{
			if (item == null) 
			{
				log.error("RequestQueue", "Argument 'item' must not be null.");
				return;
			}
			else if (item.attributes == null) 
			{
				log.error("RequestQueue", "Item ", item, " must contain attributes.");
				return;
			}
			var a = item.attributes;			
			if (a.throttlePostpone == true && a.throttle == null) 
			{
				log.warn("RequestQueue", "Item ", item, " has throttlePostpone set but no throttle specified - ignored.");
			} 
			else if (a.throttle != null && !isNonEmpty(a.token)) 
			{
				log.warn("RequestQueue", "Item ", item, " has throttle set but no token specified - ignored.");
			}
			else if (a.throttle != null) 
			{
				var f = bind(function() { this.addInternal(item);}, this);
				this.throttler.throttle(a.token, a.throttle, f, a.throttlePostpone);
				return;
			}
			addInternal(item);				
		},
		
		nextInternal: function() 
		{
			this.currentItem = null;
			
			if (this.queue.length > 0)
			{
				var i = this.queue.shift();
				if (i.checkPreconditions())
				{
					this.currentItem = i;
					var s = bind(function() { this.skip(i); }, this);
					var a = i.attributes;
					var t = a.requestTimeout + a.processingTimeout;
					
					// failsafe timeout, in case the request queue item fails to call next() 
					window.setTimeout(s, t);
					
					var next = bind(this.next, this);
					i.execute(next);
				}
				else
				{
					this.next();
				}
			}
		},		
		
		next: function() 
		{		
			window.setTimeout(bind(this.nextInternal, this), 0);
		},
		
		skip: function(item) 
		{
			if (this.currentItem == item)
			{
				log.error("RequestQueue", "Timeout exceeded, skipping item", item);
				this.currentItem = null;
				this.next();
			}
		}	
		
	};
	
	var globalSettings = 
	{
		defaultRequestTimeout: 60000,
		defaultProcessingTimeout: 60000,
		defaultPageId: -1,
		defaultToken: null,
		defaultRemovePrevious: false,
		beforeHandlers: [],
		preconditions: [],
		successHandlers: [],
		errorHandlers: [],
		urlPostProcessors: [],
		urlArgumentMethods: []
	};
	
	var Ajax = function() 
	{
		this.globalSettings = globalSettings;
	};
	
	Wicket.ajax = new Ajax();

	// ===================== REVERT THE OLD WICKET OBJECT ===================== 		
	
	WicketNG = Wicket;	
	Wicket = oldWicket;
	
})();