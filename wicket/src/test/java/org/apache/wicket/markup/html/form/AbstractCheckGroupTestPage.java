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
package org.apache.wicket.markup.html.form;

import java.io.Serializable;
import java.util.List;

import org.apache.wicket.markup.html.WebMarkupContainer;
import org.apache.wicket.markup.html.WebPage;
import org.apache.wicket.model.Model;


/**
 * Tests rendering of the CheckGroup and Check components
 * 
 * @author igor
 */
public abstract class AbstractCheckGroupTestPage extends WebPage
{
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;


	/**
	 * Constructor
	 * 
	 * @param list
	 */
	public AbstractCheckGroupTestPage(List<String> list)
	{

		Form<?> form = new Form("form");
		CheckGroup<String> group = new CheckGroup<String>("group", new Model((Serializable)list));
		WebMarkupContainer container = new WebMarkupContainer("container");
		Check<String> check1 = new Check<String>("check1", new Model<String>("check1"));
		Check<String> check2 = new Check<String>("check2", new Model<String>("check2"));


		add(form);
		form.add(group);
		group.add(check1);
		group.add(container);
		container.add(check2);
	}
}