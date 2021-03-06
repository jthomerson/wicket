/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.wicket.ajax;

import org.apache.wicket.IClusterable;

/**
 * A Channel that used to process Ajax requests.
 * 
 * Channels are either:
 * <ul>
 * <li>queueing - Ajax requests are kept in a Queue at the client side and processed one at a time.
 * Default.</li>
 * <li>dropping - only the last Ajax request is processed, the others are discarded</li>
 * </ul>
 * 
 * @author Martin Dilger
 */
public class AjaxChannel implements IClusterable
{

	/**
	 * The type of an {@link AjaxChannel}
	 */
	public static enum Type {

		/**
		 * Ajax requests are kept in a Queue at the client side and processed one at a time
		 */
		QUEUE,

		/**
		 * dropping - only the last Ajax request is processed, the others are discarded
		 */
		DROP;
	}

	private final String name;

	private final Type type;

	/**
	 * Construct.
	 * 
	 * @param name
	 */
	public AjaxChannel(final String name)
	{
		this(name, Type.QUEUE);
	}

	/**
	 * Construct.
	 * 
	 * @param name
	 *            the name of the channel
	 * @param type
	 *            the behavior type of this channel
	 */
	public AjaxChannel(final String name, final Type type)
	{
		this.name = name;
		this.type = type;
	}

	/**
	 * @return the name
	 */
	public String getName()
	{
		return name;
	}

	/**
	 * @return the type of this channel
	 * @see AjaxChannel.Type
	 */
	public Type getType()
	{
		return type;
	}

	/**
	 * Calculates the ChannelName.
	 * 
	 * @return a String in the format channelName|d for DropChannels, channelName|s for Stackable
	 *         Channels.
	 */
	String getChannelName()
	{
		return toString();
	}

	@Override
	public String toString()
	{
		// 's' comes from 'stack', but it really acts as a queue.
		// TODO Wicket 1.6 - consider renaming it to 'q'
		return String.format("%s|%s", name, type == Type.QUEUE ? "s" : "d");
	}
}
